import 'dart:convert';
import 'package:http/http.dart' as http;

class GoogleSheetsSyncService {
  final String googleAppsScriptUrl;

  GoogleSheetsSyncService({required this.googleAppsScriptUrl});

  /// Syncs visit data to Google Sheets via Google Apps Script Webhook
  Future<bool> syncVisitToSheet({
    required String visitId,
    required String patientName,
    required String phone,
    required String visitDate,
    required String procedures,
    required double totalDue,
    required double paidAmount,
    required String nurseName,
  }) async {
    try {
      final response = await http.post(
        Uri.parse(googleAppsScriptUrl),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'action': 'ADD_VISIT_ROW',
          'payload': {
            'visitId': visitId,
            'patientName': patientName,
            'phone': phone,
            'visitDate': visitDate,
            'procedures': procedures,
            'totalDue': totalDue,
            'paidAmount': paidAmount,
            'nurseName': nurseName,
            'syncedAt': DateTime.now().toIso8601String(),
          }
        }),
      );

      if (response.statusCode == 200) {
        final resJson = jsonDecode(response.body);
        return resJson['status'] == 'success';
      }
      return false;
    } catch (e) {
      print('Google Sheets Sync Error: $e');
      return false;
    }
  }
}
