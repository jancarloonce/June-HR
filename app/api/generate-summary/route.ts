import { NextResponse } from "next/server"
import ExcelJS from "exceljs"

export async function POST(req: Request) {
  const { examResult, hourlyRate, successfulCampaign, followUpQuestion, followUpResponse, candidateInfo } =
    await req.json()

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Interview Summary")

  // Define Colors
  const headerColor = "D6EAF8"
  const titleColor = "AED6F1"

  worksheet.mergeCells("A1:B1")
  worksheet.mergeCells("A2:B2")
  worksheet.mergeCells("A3:B3")
  worksheet.mergeCells("A7:B7")
  worksheet.mergeCells("A11:B11")
  worksheet.mergeCells("A14:B14")
  worksheet.mergeCells("A17:B17")

  const titleStyle = {
    alignment: { horizontal: "center", vertical: "middle" },
    font: { bold: true, color: { argb: "000000" }, size: 14 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: titleColor } },
  }

  const sectionStyle = {
    alignment: { horizontal: "center", vertical: "middle" },
    font: { bold: true, size: 12, color: { argb: "000000" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: headerColor } },
  }

  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: "thin" as const, color: { argb: "ADD8E6" } },
    left: { style: "thin" as const, color: { argb: "ADD8E6" } },
    bottom: { style: "thin" as const, color: { argb: "ADD8E6" } },
    right: { style: "thin" as const, color: { argb: "ADD8E6" } },
  }

  worksheet.getCell("A1").value = "Interview Summary Report"
  worksheet.getCell("A1").font = { name: "Georgia", bold: true, italic: true, size: 20, color: { argb: "000000" } }
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: titleColor } }

  worksheet.getCell("A2").value = `Generated on: ${new Date().toLocaleString()}`
  Object.assign(worksheet.getCell("A2"), titleStyle)

  worksheet.getCell("A3").value = "CANDIDATE INFORMATION"
  Object.assign(worksheet.getCell("A3"), sectionStyle)

  worksheet.getCell("A4").value = "Full Name:"
  worksheet.getCell("B4").value = candidateInfo?.name || "N/A"

  worksheet.getCell("A5").value = "Email:"
  worksheet.getCell("B5").value = candidateInfo?.email || "N/A"

  worksheet.getCell("A6").value = "Phone:"
  worksheet.getCell("B6").value = candidateInfo?.phone || "N/A"

  worksheet.getCell("A7").value = "EXAM RESULTS"
  Object.assign(worksheet.getCell("A7"), sectionStyle)

  worksheet.getCell("A8").value = "Status:"
  worksheet.getCell("B8").value = examResult?.isCorrect ? "PASSED" : "FAILED"

  worksheet.getCell("A9").value = "Formula Accuracy:"
  worksheet.getCell("B9").value = `${examResult?.formulaAccuracy || 0}%`

  worksheet.getCell("A10").value = "Calculation Accuracy:"
  worksheet.getCell("B10").value = `${examResult?.calculationAccuracy || 0}%`

  worksheet.getCell("A11").value = "INTERVIEW RESPONSES"
  Object.assign(worksheet.getCell("A11"), sectionStyle)

  worksheet.getCell("A12").value = "Expected Hourly Rate:"
  worksheet.getCell("B12").value = hourlyRate || "N/A"

  worksheet.getCell("A13").value = "Most Successful Campaign:"
  worksheet.getCell("B13").value = successfulCampaign || "N/A"

  worksheet.getCell("A14").value = "FOLLOW-UP ASSESSMENT"
  Object.assign(worksheet.getCell("A14"), sectionStyle)

  worksheet.getCell("A15").value = "Question:"
  worksheet.getCell("B15").value = followUpQuestion || "N/A"

  worksheet.getCell("A16").value = "Response:"
  worksheet.getCell("B16").value = followUpResponse || "N/A"

  worksheet.getCell("A17").value = "End of Report"
  Object.assign(worksheet.getCell("A17"), sectionStyle)

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = borderStyle
    })
  })
  ;["A4", "A5", "A6", "A8", "A9", "A10", "A12", "A13", "A15", "A16"].forEach((cellRef) => {
    worksheet.getCell(cellRef).font = { bold: true }
  })
  ;[
    "A4",
    "B4",
    "A5",
    "B5",
    "A6",
    "B6",
    "A8",
    "B8",
    "A9",
    "B9",
    "A10",
    "B10",
    "A12",
    "B12",
    "A13",
    "B13",
    "A15",
    "B15",
    "A16",
    "B16",
  ].forEach((cellRef) => {
    worksheet.getCell(cellRef).alignment = { vertical: "middle", horizontal: "left" }
  })
  ;["B13", "B15", "B16"].forEach((cellRef) => {
    worksheet.getCell(cellRef).alignment = { wrapText: true, vertical: "middle", horizontal: "left" }
  })

  worksheet.columns = [
    { key: "colA", width: 30 },
    { key: "colB", width: 50 },
  ]
  ;[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 17].forEach((rowNum) => {
    worksheet.getRow(rowNum).height = 30
  })
  ;[13, 15, 16].forEach((rowNum) => {
    worksheet.getRow(rowNum).height = 70
  })

  worksheet.spliceRows(18, 1)

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=interview_summary_${new Date().toISOString().split("T")[0]}.xlsx`,
    },
  })
}

