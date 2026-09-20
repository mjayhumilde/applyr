import {
  RESUME_MAX_BYTES,
  resumeFileNameSchema,
  type ResumeMediaType,
} from "@applyr/contracts";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { crc32 } from "node:zlib";
import { fromBufferPromise } from "yauzl";
import { z } from "zod";

import { HttpError } from "../../errors/http-error.js";

const MAX_ENTRIES = 200;
const MAX_EXPANDED_BYTES = 20 * 1024 * 1024;
const MAX_XML_BYTES = 2 * 1024 * 1024;
const MAX_COMPRESSION_RATIO = 500;
const DOCUMENT_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml";
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  processEntities: false,
  isArray: (name) => name === "Override" || name === "Relationship",
});
const contentTypesSchema = z.object({
  Types: z.object({
    Override: z.array(
      z.object({ "@_PartName": z.string(), "@_ContentType": z.string() }),
    ),
  }),
});
const relationshipsSchema = z.object({
  Relationships: z.preprocess(
    // The XML parser represents an empty <Relationships/> element as "".
    // Normalize only that case; malformed values must still fail validation.
    (value) => (value === "" ? {} : value),
    z.object({
      Relationship: z
        .array(
          z.object({
            "@_Type": z.string(),
            "@_Target": z.string(),
            // Reject encoded/unknown modes rather than interpreting them
            // differently from a browser or Word when the original is opened.
            "@_TargetMode": z.enum(["External", "Internal"]).optional(),
          }),
        )
        .default([]),
    }),
  ),
});

function invalidFile(message: string): HttpError {
  return new HttpError(400, "VALIDATION_ERROR", message);
}

/** Validate the actual bytes, not just a browser-supplied extension/MIME type. */
export async function validateResumeFile(
  bytes: Buffer,
  fileName: string,
  mediaType: ResumeMediaType,
): Promise<void> {
  if (!resumeFileNameSchema.safeParse(fileName).success) {
    throw invalidFile("Choose a PDF or DOCX with a valid file name");
  }
  if (bytes.length === 0 || bytes.length > RESUME_MAX_BYTES) {
    throw invalidFile("Choose a non-empty resume no larger than 4 MB");
  }

  if (mediaType === "application/pdf") {
    if (
      !/\.pdf$/i.test(fileName) ||
      !/^%PDF-(?:1\.[0-7]|2\.0)(?:\r|\n)/.test(
        bytes.subarray(0, 16).toString("ascii"),
      ) ||
      !/%%EOF\s*$/.test(bytes.subarray(-1024).toString("ascii"))
    ) {
      throw invalidFile(
        "The file is not a supported PDF. Export it as PDF again.",
      );
    }
    return;
  }

  if (
    !/\.docx$/i.test(fileName) ||
    bytes.length < 4 ||
    bytes.readUInt32LE(0) !== 0x04034b50
  ) {
    throw invalidFile("The file is not a DOCX document");
  }

  try {
    await validateDocx(bytes);
  } catch (error: unknown) {
    if (error instanceof HttpError) throw error;
    throw invalidFile(
      "The DOCX file is damaged or unsupported. Save it again.",
    );
  }
}

async function validateDocx(bytes: Buffer): Promise<void> {
  const archive = await fromBufferPromise(bytes, {
    lazyEntries: true,
    strictFileNames: true,
    validateEntrySizes: true,
  });
  const names = new Set<string>();
  let expandedBytes = 0;
  let documentFound = false;
  let documentTypeFound = false;
  let rootRelationshipFound = false;
  const deadline = Date.now() + 5000;

  try {
    if (archive.entryCount > MAX_ENTRIES) {
      throw invalidFile(
        "This DOCX is too complex. Export a simpler DOCX or PDF.",
      );
    }

    for await (const entry of archive.eachEntry()) {
      const name = entry.fileName;
      if (
        Date.now() > deadline ||
        names.has(name) ||
        names.size >= MAX_ENTRIES ||
        entry.isEncrypted() ||
        !entry.canDecodeFileData() ||
        /(?:vbaProject|activeX|embeddings|altChunk)/i.test(name) ||
        /\.(?:exe|dll|js|html?|svg)$/i.test(name)
      ) {
        throw invalidFile(
          "Use a DOCX without encryption, macros, or embedded programs.",
        );
      }
      names.add(name);
      expandedBytes += entry.uncompressedSize;
      const isXml = /\.(?:xml|rels)$/i.test(name);
      if (
        expandedBytes > MAX_EXPANDED_BYTES ||
        (isXml && entry.uncompressedSize > MAX_XML_BYTES) ||
        entry.uncompressedSize >
          Math.max(entry.compressedSize, 1) * MAX_COMPRESSION_RATIO
      ) {
        throw invalidFile(
          "This DOCX expands beyond the preview limit. Export it as PDF.",
        );
      }

      // Bound actual decompression as well as the ZIP directory's claimed sizes.
      const stream = await archive.openReadStreamPromise(entry);
      const chunks: Buffer[] = [];
      let length = 0;
      let checksum = 0;
      for await (const chunk of stream) {
        if (!Buffer.isBuffer(chunk)) throw invalidFile("Invalid DOCX data");
        length += chunk.length;
        if (length > entry.uncompressedSize || Date.now() > deadline) {
          stream.destroy();
          throw invalidFile("This DOCX exceeds the safe preview limits");
        }
        checksum = crc32(chunk, checksum);
        if (isXml) chunks.push(chunk);
      }
      if (length !== entry.uncompressedSize || checksum !== entry.crc32) {
        throw invalidFile("The DOCX file is damaged. Save it again.");
      }
      if (!isXml) continue;

      const xml = Buffer.concat(chunks).toString("utf8");
      if (
        /<!DOCTYPE|<!ENTITY/i.test(xml) ||
        XMLValidator.validate(xml) !== true
      ) {
        throw invalidFile("This DOCX contains unsupported document markup");
      }
      if (name === "[Content_Types].xml") {
        const parsed: unknown = xmlParser.parse(xml);
        const contentTypes = contentTypesSchema.parse(parsed);
        documentTypeFound = contentTypes.Types.Override.some(
          (item) =>
            item["@_PartName"] === "/word/document.xml" &&
            item["@_ContentType"] === DOCUMENT_CONTENT_TYPE,
        );
      }
      if (name === "word/document.xml") {
        const parsed: unknown = xmlParser.parse(xml);
        documentFound = z
          .object({ document: z.object({ body: z.unknown() }) })
          .safeParse(parsed).success;
      }
      if (name.endsWith(".rels")) {
        const parsed: unknown = xmlParser.parse(xml);
        const relationships =
          relationshipsSchema.parse(parsed).Relationships.Relationship;
        for (const relationship of relationships) {
          // Normal hyperlinks are inert in our preview. Remote images/templates
          // must never be fetched by the renderer or the server.
          if (
            relationship["@_TargetMode"] === "External" &&
            !relationship["@_Type"].endsWith("/hyperlink")
          ) {
            throw invalidFile(
              "Embed linked images in the DOCX before uploading it.",
            );
          }
        }
        if (name === "_rels/.rels") {
          rootRelationshipFound = relationships.some(
            (item) =>
              item["@_Type"].endsWith("/officeDocument") &&
              item["@_Target"].replace(/^\//, "") === "word/document.xml" &&
              item["@_TargetMode"] !== "External",
          );
        }
      }
    }
    if (!documentFound || !documentTypeFound || !rootRelationshipFound) {
      throw invalidFile("The file is not a supported Word DOCX document");
    }
  } finally {
    archive.close();
  }
}
