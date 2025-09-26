"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, AlertCircle, Upload, Eye } from "lucide-react";
import { PDFDocument } from "pdf-lib";

// PDF Viewer Options Constants
const PDF_VIEWER_OPTIONS = {
  // Toolbar Options
  TOOLBAR_ENABLED: "1",
  TOOLBAR_DISABLED: "0",
  // Navigation Pane Options
  NAVPANES_ENABLED: "1",
  NAVPANES_DISABLED: "0",
  // Scrollbar Options
  SCROLLBAR_ENABLED: "1",
  SCROLLBAR_DISABLED: "0",
  // Status Bar Options
  STATUSBAR_ENABLED: "1",
  STATUSBAR_DISABLED: "0",
  // Messages Options
  MESSAGES_ENABLED: "1",
  MESSAGES_DISABLED: "0",
  // Zoom Options
  ZOOM_FIT_WIDTH: "fit",
  ZOOM_FIT_HEIGHT: "fitH",
  ZOOM_FIT_VERTICAL: "fitV",
  ZOOM_100: "100",
  ZOOM_125: "125",
  ZOOM_150: "150",
  ZOOM_200: "200",
  // Page Options
  PAGE_START: "1",
} as const;

interface PdfPageExtractorProps {
  pdfPath?: string; // Path to PDF file in /public folder (e.g., "/documents/sample.pdf")
  pageNumbers?: string; // Optional default page numbers
  autoExtract?: boolean; // Whether to automatically extract on load
  filename?: string; // Optional custom filename for output
  allowFileUpload?: boolean; // Whether to show file upload option
  onlyPreview?: boolean; // Whether to show other options or not
}

export default function PdfPageViewer({
  pdfPath,
  pageNumbers: defaultPageNumbers = "",
  autoExtract = false,
  filename,
  allowFileUpload = true,
  onlyPreview = false,
}: PdfPageExtractorProps) {
  const [pdfDocument, setPdfDocument] = useState<PDFDocument | null>(null);
  const [pageNumbers, setPageNumbers] = useState<string>(defaultPageNumbers);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [totalPages, setTotalPages] = useState<number>(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pdfSource, setPdfSource] = useState<string>("");
  const [extractedPdfUrl, setExtractedPdfUrl] = useState<string>("");
  const [extractedFilename, setExtractedFilename] = useState<string>("");

  // Load PDF from path on mount
  useEffect(() => {
    if (pdfPath) {
      loadPdfFromPath(pdfPath);
    }
  }, [pdfPath]);

  // Update local pageNumbers state when prop changes
  useEffect(() => {
    setPageNumbers(defaultPageNumbers);
  }, [defaultPageNumbers]);

  // Separate effect for auto-extraction when both PDF and page numbers are ready
  useEffect(() => {
    if (pdfDocument && autoExtract && pageNumbers.trim()) {
      extractPages();
    }
  }, [pdfDocument, autoExtract, pageNumbers]);

  useEffect(() => {
    if (pdfPath && autoExtract) loadPdfFromPath(pdfPath);
  }, [pdfPath, autoExtract, defaultPageNumbers]);

  // Cleanup extracted PDF URL when component unmounts or new extraction starts
  useEffect(() => {
    return () => {
      if (extractedPdfUrl) {
        URL.revokeObjectURL(extractedPdfUrl);
      }
    };
  }, [extractedPdfUrl]);

  const loadPdfFromPath = async (path: string) => {
    setIsLoading(true);
    setError("");
    setPdfSource(`File: ${path.split("/").pop()}`);

    try {
      console.log("[v0] Attempting to load PDF from:", path);
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      console.log("[v0] PDF file size:", arrayBuffer.byteLength, "bytes");

      if (arrayBuffer.byteLength === 0) {
        throw new Error("PDF file is empty");
      }

      await loadPdfFromArrayBuffer(arrayBuffer);

      // Remove the setTimeout auto-extraction logic from here
      // It's now handled by the separate useEffect
    } catch (err) {
      console.error("[v0] PDF loading error:", err);
      handleLoadError(err, path);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      setError("Please select a valid PDF file");
      return;
    }

    setSelectedFile(file);
    setError("");
    setIsLoading(true);
    setPdfSource(`Uploaded: ${file.name}`);

    try {
      const arrayBuffer = await file.arrayBuffer();
      await loadPdfFromArrayBuffer(arrayBuffer);
    } catch (err) {
      handleLoadError(err, file.name);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPdfFromArrayBuffer = async (arrayBuffer: ArrayBuffer) => {
    // Check if it's actually a PDF by looking for PDF header
    const uint8Array = new Uint8Array(arrayBuffer);
    const header = String.fromCharCode(...uint8Array.slice(0, 4));
    if (header !== "%PDF") {
      throw new Error("File is not a valid PDF document");
    }

    const pdfDoc = await PDFDocument.load(arrayBuffer);
    console.log("[v0] PDF loaded successfully, pages:", pdfDoc.getPageCount());

    setPdfDocument(pdfDoc);
    setTotalPages(pdfDoc.getPageCount());
  };

  const handleLoadError = (err: any, source: string) => {
    if (err instanceof Error) {
      if (err.message.includes("404") || err.message.includes("Not Found")) {
        setError(
          `PDF file not found at ${source}. Please make sure the file exists.`
        );
      } else if (err.message.includes("not a valid PDF")) {
        setError(`The file ${source} is not a valid PDF document.`);
      } else if (err.message.includes("empty")) {
        setError(`The file ${source} is empty or corrupted.`);
      } else {
        setError(`Failed to load PDF: ${err.message}`);
      }
    } else {
      setError(`Failed to load PDF from ${source}`);
    }
  };

  const parsePageNumbers = (input: string): number[] => {
    const pages: number[] = [];
    const parts = input.split(",");

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        // Handle ranges like "1-3"
        const [start, end] = trimmed
          .split("-")
          .map((n) => Number.parseInt(n.trim()));
        if (start && end && start <= end) {
          for (let i = start; i <= end; i++) {
            pages.push(i);
          }
        }
      } else {
        // Handle single pages
        const pageNum = Number.parseInt(trimmed);
        if (pageNum) {
          pages.push(pageNum);
        }
      }
    }

    return [...new Set(pages)].sort((a, b) => a - b); // Remove duplicates and sort
  };

  const extractPages = async () => {
    if (!pdfDocument || !pageNumbers.trim()) {
      setError("PDF not loaded or no page numbers specified");
      return;
    }

    setIsProcessing(true);
    setError("");

    // Clean up previous extracted PDF URL
    if (extractedPdfUrl) {
      URL.revokeObjectURL(extractedPdfUrl);
      setExtractedPdfUrl("");
    }

    try {
      const pageList = parsePageNumbers(pageNumbers);

      if (pageList.length === 0) {
        setError("Please enter valid page numbers");
        setIsProcessing(false);
        return;
      }

      // Validate page numbers
      const invalidPages = pageList.filter(
        (page) => page < 1 || page > totalPages
      );
      if (invalidPages.length > 0) {
        setError(
          `Invalid page numbers: ${invalidPages.join(
            ", "
          )}. PDF has ${totalPages} pages.`
        );
        setIsProcessing(false);
        return;
      }

      // Create a new PDF document
      const newPdf = await PDFDocument.create();

      // Copy specified pages to the new PDF
      for (const pageNum of pageList) {
        const [copiedPage] = await newPdf.copyPages(pdfDocument, [pageNum - 1]); // PDF pages are 0-indexed
        newPdf.addPage(copiedPage);
      }

      // Generate the new PDF
      const pdfBytes = await newPdf.save();

      // Create blob URL for display
      const blob = new Blob([pdfBytes] as any, { type: "application/pdf" });
      const url = URL.createObjectURL(blob);

      const baseName =
        filename ||
        (selectedFile
          ? selectedFile.name.replace(".pdf", "")
          : pdfPath
          ? pdfPath.split("/").pop()?.replace(".pdf", "")
          : "document");
      const pagesStr =
        pageList.length === 1
          ? `page-${pageList[0]}`
          : `pages-${pageList.join("-")}`;
      const displayFilename = `${baseName}-${pagesStr}.pdf`;

      // Build PDF viewer URL with options using constants
      const viewerParams = [
        `toolbar=${PDF_VIEWER_OPTIONS.TOOLBAR_ENABLED}`,
        `navpanes=${PDF_VIEWER_OPTIONS.NAVPANES_DISABLED}`,
        // `scrollbar=${PDF_VIEWER_OPTIONS.SCROLLBAR_DISABLED}`,
        `page=${PDF_VIEWER_OPTIONS.PAGE_START}`,
        // `zoom=${PDF_VIEWER_OPTIONS.ZOOM_FIT_WIDTH}`,
      ].join("&");

      const pdfViewerUrl = `${url}#${viewerParams}`;

      // Set the extracted PDF for display
      setExtractedPdfUrl(pdfViewerUrl);
      setExtractedFilename(displayFilename);
    } catch (err) {
      setError("Failed to extract pages. Please try again.");
      console.error(err);
    } finally {
      setIsProcessing(false);
    }
  };

  return !extractedPdfUrl ? (
    <PdfCardSkeleton />
  ) : (
    <div className="w-full space-y-6">
      {!onlyPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Extract PDF Pages
            </CardTitle>
            <CardDescription>
              {pdfPath
                ? `Extract pages from: ${pdfPath.split("/").pop()}`
                : "Extract specific pages from PDF files"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Show tabs only if file upload is allowed and no PDF path is provided */}
            {allowFileUpload && !pdfPath ? (
              <Tabs defaultValue="upload" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="upload">Upload PDF</TabsTrigger>
                  <TabsTrigger value="path">Use File Path</TabsTrigger>
                </TabsList>

                <TabsContent value="upload" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pdf-file">Select PDF File</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="pdf-file"
                        type="file"
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="flex-1"
                      />
                      <Upload className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="path" className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">
                      Using File Paths:
                    </h4>
                    <p className="text-sm text-blue-700">
                      Place your PDF in the <code>/public</code> folder and use
                      the component with a <code>pdfPath</code> prop.
                    </p>
                    <code className="text-xs bg-blue-100 px-2 py-1 rounded mt-2 block">
                      {`<PdfPageExtractor pdfPath="/your-file.pdf" />`}
                    </code>
                  </div>
                </TabsContent>
              </Tabs>
            ) : pdfPath ? (
              // Show loading/status for path-based loading
              <div>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mr-2" />
                    <span>Loading PDF...</span>
                  </div>
                ) : pdfDocument ? (
                  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-600" />
                      <p className="text-sm font-medium text-green-800">
                        PDF Loaded Successfully
                      </p>
                    </div>
                    <p className="text-sm text-green-700 mt-1">
                      {pdfSource} ({totalPages} pages)
                    </p>
                  </div>
                ) : null}
              </div>
            ) : allowFileUpload ? null : (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                <AlertCircle className="h-4 w-4 text-amber-600 mb-2" />
                <p className="text-sm text-amber-700">
                  No PDF source configured. Please provide a{" "}
                  <code>pdfPath</code> prop or enable{" "}
                  <code>allowFileUpload</code>.
                </p>
              </div>
            )}

            {/* Show status for uploaded files */}
            {selectedFile && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-medium text-green-800">
                    PDF Loaded Successfully
                  </p>
                </div>
                <p className="text-sm text-green-700 mt-1">
                  {pdfSource} ({totalPages} pages)
                </p>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Page Numbers Input */}
            <div className="space-y-2">
              <Label htmlFor="page-numbers">Page Numbers</Label>
              <Input
                id="page-numbers"
                type="text"
                placeholder="e.g., 1, 3, 5-7, 10"
                value={pageNumbers}
                onChange={(e: any) => setPageNumbers(e.target.value)}
                disabled={isLoading || !pdfDocument}
              />
              <p className="text-xs text-muted-foreground">
                Enter page numbers separated by commas. Use ranges like "5-7"
                for multiple consecutive pages.
              </p>
            </div>

            {/* Extract Button */}
            <Button
              onClick={extractPages}
              disabled={
                isLoading || !pdfDocument || !pageNumbers.trim() || isProcessing
              }
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Extract & View Pages
                </>
              )}
            </Button>

            {/* Usage Examples */}
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Page Number Examples:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>
                  • <code>4</code> - Extract only page 4
                </li>
                <li>
                  • <code>1, 3, 5</code> - Extract pages 1, 3, and 5
                </li>
                <li>
                  • <code>2-5</code> - Extract pages 2 through 5
                </li>
                <li>
                  • <code>1, 3-6, 10</code> - Extract page 1, pages 3-6, and
                  page 10
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* PDF Viewer Section */}
      {extractedPdfUrl && (
        <Card>
          <CardHeader className="hidden">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Extracted Pages
            </CardTitle>
            <CardDescription>Viewing: {extractedFilename}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[600px] border rounded-lg overflow-hidden">
              <iframe
                src={extractedPdfUrl}
                className="w-full h-full"
                title="Extracted PDF Pages"
                allow="fullscreen"
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Add these skeleton components after the PDF_VIEWER_OPTIONS constant
const PdfCardSkeleton = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Skeleton className="h-4 w-80" />
    </CardHeader>
    <CardContent className="space-y-6">
      {/* Tabs skeleton */}
      <div className="space-y-4">
        <div className="grid w-full grid-cols-2 gap-2">
          <Skeleton className="h-10 w-full rounded-md" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* File input skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 flex-1 rounded-md" />
            <Skeleton className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Page numbers input skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-10 w-full rounded-md" />
        <Skeleton className="h-3 w-96" />
      </div>

      {/* Extract button skeleton */}
      <Skeleton className="h-10 w-full rounded-md" />

      {/* Usage examples skeleton */}
      <div className="bg-muted p-4 rounded-lg space-y-3">
        <Skeleton className="h-5 w-48" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-72" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const PdfViewerSkeleton = () => (
  <Card>
    <CardHeader className="hidden">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 rounded" />
        <Skeleton className="h-6 w-36" />
      </div>
      <Skeleton className="h-4 w-48" />
    </CardHeader>
    <CardContent>
      <div className="w-full h-[600px] border rounded-lg overflow-hidden bg-muted flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse">
            <div className="mx-auto h-16 w-16 rounded-lg bg-muted-foreground/20 flex items-center justify-center">
              <FileText className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 mx-auto" />
            <Skeleton className="h-3 w-48 mx-auto" />
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const LoadingStatusSkeleton = () => (
  <div className="bg-muted border rounded-lg p-4">
    <div className="flex items-center gap-2">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
      <Skeleton className="h-4 w-32" />
    </div>
    <Skeleton className="h-3 w-48 mt-2" />
  </div>
);

const SuccessStatusSkeleton = () => (
  <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
    <div className="flex items-center gap-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 w-40" />
    </div>
    <Skeleton className="h-3 w-56 mt-2" />
  </div>
);
