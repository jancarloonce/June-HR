import { NextResponse } from "next/server"
import ExcelJS from "exceljs"

function applyBorderStyle(cell: ExcelJS.Cell, style: "thin" | "thick" = "thin", color = "000000") {
  cell.border = {
    top: { style, color: { argb: color } },
    left: { style, color: { argb: color } },
    bottom: { style, color: { argb: color } },
    right: { style, color: { argb: color } },
  }
}

export async function POST(req: Request) {
  const { examResult, hourlyRate, successfulCampaign, followUpQuestion, followUpResponse, candidateInfo } =
    await req.json()

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Interview Summary")

  // Define Colors
  const headerColor = "D6EAF8"
  const titleColor = "AED6F1"
  const lightBlueColor = "ADD8E6"
  const blackColor = "000000"

  // Merge cells
  const mergeCells = ["A1:B1", "A2:B2", "A3:B3", "A7:B7", "A11:B11", "A14:B14", "A17:B17"]
  mergeCells.forEach((range) => worksheet.mergeCells(range))

  const titleStyle = {
    alignment: { horizontal: "center", vertical: "middle" },
    font: { name: "Bahnschrift", bold: true, color: { argb: "000000" }, size: 14 },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: titleColor } },
  }

  const sectionStyle = {
    alignment: { horizontal: "center", vertical: "middle" },
    font: { bold: true, size: 14, color: { argb: "000000" } },
    fill: { type: "pattern", pattern: "solid", fgColor: { argb: headerColor } },
  }

  const centerAlignStyle = { alignment: { horizontal: "center", vertical: "middle" } }

  const cellsToModify = [
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
  ]
  cellsToModify.forEach((cellRef) => {
    const cell = worksheet.getCell(cellRef)
    if (cell.font) {
      cell.font.size = 12
    } else {
      cell.font = { size: 12 }
    }
  })

  // Apply styles and content to cells
  worksheet.getCell("A1").value = "Interview Summary Report"
  worksheet.getCell("A1").font = {
    name: "Bookman Old Style",
    bold: true,
    italic: true,
    size: 20,
    color: { argb: "000000" },
  }
  worksheet.getCell("A1").alignment = { horizontal: "center", vertical: "middle" }
  worksheet.getCell("A1").fill = { type: "pattern", pattern: "solid", fgColor: { argb: titleColor } }
  applyBorderStyle(worksheet.getCell("A1"), "thin")

  worksheet.getCell("A2").value = `Generated on: ${new Date().toLocaleString()}`
  Object.assign(worksheet.getCell("A2"), titleStyle)
  applyBorderStyle(worksheet.getCell("A2"))

  worksheet.getCell("A3").value = "CANDIDATE INFORMATION"
  Object.assign(worksheet.getCell("A3"), sectionStyle)
  applyBorderStyle(worksheet.getCell("A3"), "thin")

  // Center align and style cells
  const cellsToCenter = [
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
  ]

  cellsToCenter.forEach((cellRef) => {
    Object.assign(worksheet.getCell(cellRef), centerAlignStyle)
  })

  worksheet.getCell("A4").value = "Full Name:"
  worksheet.getCell("B4").value = candidateInfo?.name || "N/A"
  applyBorderStyle(worksheet.getCell("A4"), "thin", lightBlueColor)
  applyBorderStyle(worksheet.getCell("B4"), "thin", lightBlueColor)

  worksheet.getCell("A5").value = "Email:"
  worksheet.getCell("B5").value = candidateInfo?.email || "N/A"
  applyBorderStyle(worksheet.getCell("A5"), "thin", lightBlueColor)
  applyBorderStyle(worksheet.getCell("B5"), "thin", lightBlueColor)

  worksheet.getCell("A6").value = "Phone:"
  worksheet.getCell("B6").value = candidateInfo?.phone || "N/A"
  applyBorderStyle(worksheet.getCell("A6"), "thin", lightBlueColor)
  applyBorderStyle(worksheet.getCell("B6"), "thin", lightBlueColor)

  worksheet.getCell("A7").value = "EXAM RESULTS"
  Object.assign(worksheet.getCell("A7"), sectionStyle)
  applyBorderStyle(worksheet.getCell("A7"), "thin")

  worksheet.getCell("A8").value = "Status:"
  worksheet.getCell("B8").value = examResult?.isCorrect ? "PASSED" : "FAILED"

  worksheet.getCell("A9").value = "Formula Accuracy:"
  worksheet.getCell("B9").value = `${examResult?.formulaAccuracy || 0}%`

  worksheet.getCell("A10").value = "Calculation Accuracy:"
  worksheet.getCell("B10").value = `${examResult?.calculationAccuracy || 0}%`

  worksheet.getCell("A11").value = "INTERVIEW RESPONSES"
  Object.assign(worksheet.getCell("A11"), sectionStyle)
  applyBorderStyle(worksheet.getCell("A11"), "thin")

  worksheet.getCell("A12").value = "Expected Hourly Rate:"
  worksheet.getCell("B12").value = hourlyRate || "N/A"

  worksheet.getCell("A13").value = "Most Successful Campaign:"
  worksheet.getCell("B13").value = successfulCampaign || "N/A"

  worksheet.getCell("A14").value = "FOLLOW-UP ASSESSMENT"
  Object.assign(worksheet.getCell("A14"), sectionStyle)
  applyBorderStyle(worksheet.getCell("A14"), "thin")

  worksheet.getCell("A15").value = "Question:"
  worksheet.getCell("B15").value = followUpQuestion || "N/A"

  worksheet.getCell("A16").value = "Response:"
  worksheet.getCell("B16").value = followUpResponse || "N/A"

  worksheet.getCell("A17").value = "End of Report".toUpperCase()
  Object.assign(worksheet.getCell("A17"), sectionStyle)
  applyBorderStyle(worksheet.getCell("A17"), "thin")

  // Apply borders to all cells
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (!cell.border) {
        applyBorderStyle(cell, "thin", lightBlueColor)
      }
    })
  })

  // Apply thick borders to the outside
  worksheet.getRow(1).eachCell((cell) => {
    cell.border = { ...cell.border, top: { style: "thick", color: { argb: blackColor } } }
  })
  worksheet.getRow(worksheet.rowCount).eachCell((cell) => {
    cell.border = { ...cell.border, bottom: { style: "thick", color: { argb: blackColor } } }
  })
  worksheet.getColumn(1).eachCell((cell) => {
    cell.border = { ...cell.border, left: { style: "thick", color: { argb: blackColor } } }
  })
  worksheet.getColumn(worksheet.columnCount).eachCell((cell) => {
    cell.border = { ...cell.border, right: { style: "thick", color: { argb: blackColor } } }
  })

  // Set column widths
  worksheet.columns = [
    { key: "colA", width: 30 },
    { key: "colB", width: 50 },
  ]

  // Set row heights
  worksheet.getRow(1).height = 50
  worksheet.getRow(2).height = 40
  ;[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 17].forEach((rowNum) => {
    worksheet.getRow(rowNum).height = 30
  })
  ;[13, 16].forEach((rowNum) => {
    worksheet.getRow(rowNum).height = 70
  })
  worksheet.getRow(15).height = 100

  worksheet.spliceRows(18, 1)
  ;["A4", "A5", "A6", "A8", "A9", "A10", "A12", "A13", "A15", "A16"].forEach((cellRef) => {
    worksheet.getCell(cellRef).font = { ...worksheet.getCell(cellRef).font, bold: true }
  })

  // Center align and wrap text for B13, B15, and B16
  ;["B13", "B15", "B16"].forEach((cellRef) => {
    worksheet.getCell(cellRef).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename=interview_summary_${new Date().toISOString().split("T")[0]}.xlsx`,
    },
  })
}

