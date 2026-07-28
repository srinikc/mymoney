import "jspdf"

declare module "jspdf" {
  interface jsPDF {
    autoTable: (options: Record<string, unknown>) => jsPDF
    previousAutoTable: { finalY: number }
  }
}
