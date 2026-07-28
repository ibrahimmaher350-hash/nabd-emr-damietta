import 'dart:typed_data';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

class PdfPrescriptionGenerator {
  static Future<Uint8List> generatePrescriptionPdf({
    required String patientName,
    required int age,
    required String gender,
    required String doctorName,
    required String dateStr,
    required List<Map<String, String>> medications,
    required String qrData,
  }) async {
    final pdf = pw.Document();

    pdf.addPage(
      pw.Page(
        pageFormat: PdfPageFormat.a4,
        textDirection: pw.TextDirection.rtl,
        build: (pw.Context context) {
          return pw.Column(
            crossAxisAlignment: pw.CrossAxisAlignment.start,
            children: [
              // Header
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text(
                        'نبض للتمريض المنزلي',
                        style: pw.TextStyle(fontSize: 22, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900),
                      ),
                      pw.Text('Nabd Home Nursing & EMR Services', style: const pw.TextStyle(fontSize: 10, color: PdfColors.grey700)),
                      pw.Text('الهاتف: +201012345678', style: const pw.TextStyle(fontSize: 10)),
                    ],
                  ),
                  pw.BarcodeWidget(
                    barcode: pw.Barcode.qrCode(),
                    data: qrData,
                    width: 65,
                    height: 65,
                  ),
                ],
              ),
              pw.Divider(thickness: 1.5, color: PdfColors.blue800),
              pw.SizedBox(height: 10),

              // Patient Details Bar
              pw.Container(
                padding: const pw.EdgeInsets.all(8),
                decoration: pw.BoxDecoration(
                  color: PdfColors.grey200,
                  borderRadius: pw.BorderRadius.circular(6),
                ),
                child: pw.Row(
                  mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                  children: [
                    pw.Text('اسم المريض: $patientName', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    pw.Text('السن: $age سنة'),
                    pw.Text('الجنس: $gender'),
                    pw.Text('التاريخ: $dateStr'),
                  ],
                ),
              ),
              pw.SizedBox(height: 15),

              // Rx Title
              pw.Text(
                'الروشتة الطبية / Prescription',
                style: pw.TextStyle(fontSize: 16, fontWeight: pw.FontWeight.bold, color: PdfColors.blue900),
              ),
              pw.SizedBox(height: 8),

              // Medications Table
              pw.TableHelper.fromTextArray(
                border: pw.TableBorder.all(color: PdfColors.grey400, width: 0.5),
                headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold, color: PdfColors.white),
                headerDecoration: const pw.BoxDecoration(color: PdfColors.blue800),
                cellAlignment: pw.Alignment.centerRight,
                headers: ['الدواء (Medication)', 'الجرعة (Dose)', 'التكرار (Frequency)', 'المدة (Duration)', 'تعليمات (Instructions)'],
                data: medications.map((med) => [
                  med['name'] ?? '',
                  med['dose'] ?? '',
                  med['frequency'] ?? '',
                  med['duration'] ?? '',
                  med['instructions'] ?? '',
                ]).toList(),
              ),

              pw.Spacer(),

              // Footer Signature & Verification
              pw.Divider(thickness: 1, color: PdfColors.grey400),
              pw.Row(
                mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                children: [
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.start,
                    children: [
                      pw.Text('توقيع الطبيب / الممرض المسؤول:'),
                      pw.SizedBox(height: 20),
                      pw.Text(doctorName, style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    ],
                  ),
                  pw.Column(
                    crossAxisAlignment: pw.CrossAxisAlignment.end,
                    children: [
                      pw.Text('رمز التحقق الإلكتروني للتقرير', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
                      pw.Text('هذا المستند صادر إلكترونياً من نظام نبض', style: const pw.TextStyle(fontSize: 8, color: PdfColors.grey600)),
                    ],
                  ),
                ],
              ),
            ],
          );
        },
      ),
    );

    return pdf.save();
  }
}
