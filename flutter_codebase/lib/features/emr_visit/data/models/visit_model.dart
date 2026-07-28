import 'package:cloud_firestore/cloud_firestore.dart';

class VitalsModel {
  final double temperature;
  final int pulseRate;
  final int bpSystolic;
  final int bpDiastolic;
  final int respiratoryRate;
  final int spO2;
  final int bloodSugarMgDl;
  final String bloodSugarType;
  final int painScale;
  final double weightKg;
  final double heightCm;
  final double bmi;

  VitalsModel({
    required this.temperature,
    required this.pulseRate,
    required this.bpSystolic,
    required this.bpDiastolic,
    required this.respiratoryRate,
    required this.spO2,
    required this.bloodSugarMgDl,
    required this.bloodSugarType,
    required this.painScale,
    required this.weightKg,
    required this.heightCm,
    required this.bmi,
  });

  Map<String, dynamic> toMap() => {
        'temperature': temperature,
        'pulseRate': pulseRate,
        'bloodPressureSystolic': bpSystolic,
        'bloodPressureDiastolic': bpDiastolic,
        'respiratoryRate': respiratoryRate,
        'spO2': spO2,
        'bloodSugarMgDl': bloodSugarMgDl,
        'bloodSugarType': bloodSugarType,
        'painScale': painScale,
        'weightKg': weightKg,
        'heightCm': heightCm,
        'bmi': bmi,
      };

  factory VitalsModel.fromMap(Map<String, dynamic> map) => VitalsModel(
        temperature: (map['temperature'] as num?)?.toDouble() ?? 37.0,
        pulseRate: (map['pulseRate'] as num?)?.toInt() ?? 75,
        bpSystolic: (map['bloodPressureSystolic'] as num?)?.toInt() ?? 120,
        bpDiastolic: (map['bloodPressureDiastolic'] as num?)?.toInt() ?? 80,
        respiratoryRate: (map['respiratoryRate'] as num?)?.toInt() ?? 18,
        spO2: (map['spO2'] as num?)?.toInt() ?? 98,
        bloodSugarMgDl: (map['bloodSugarMgDl'] as num?)?.toInt() ?? 100,
        bloodSugarType: map['bloodSugarType'] ?? 'random',
        painScale: (map['painScale'] as num?)?.toInt() ?? 0,
        weightKg: (map['weightKg'] as num?)?.toDouble() ?? 0.0,
        heightCm: (map['heightCm'] as num?)?.toDouble() ?? 0.0,
        bmi: (map['bmi'] as num?)?.toDouble() ?? 0.0,
      );
}

class VisitModel {
  final String visitId;
  final String patientId;
  final String nurseId;
  final String nurseName;
  final DateTime visitDate;
  final String chiefComplaint;
  final String hpi;
  final VitalsModel vitals;
  final List<String> procedures;
  final DateTime createdAt;

  VisitModel({
    required this.visitId,
    required this.patientId,
    required this.nurseId,
    required this.nurseName,
    required this.visitDate,
    required this.chiefComplaint,
    required this.hpi,
    required this.vitals,
    required this.procedures,
    required this.createdAt,
  });

  Map<String, dynamic> toMap() => {
        'visitId': visitId,
        'patientId': patientId,
        'nurseId': nurseId,
        'nurseName': nurseName,
        'visitDate': Timestamp.fromDate(visitDate),
        'chiefComplaint': chiefComplaint,
        'hpi': hpi,
        'vitals': vitals.toMap(),
        'procedures': procedures,
        'createdAt': Timestamp.fromDate(createdAt),
      };

  factory VisitModel.fromMap(Map<String, dynamic> map, String id) {
    return VisitModel(
      visitId: id,
      patientId: map['patientId'] ?? '',
      nurseId: map['nurseId'] ?? '',
      nurseName: map['nurseName'] ?? '',
      visitDate: (map['visitDate'] as Timestamp).toDate(),
      chiefComplaint: map['chiefComplaint'] ?? '',
      hpi: map['hpi'] ?? '',
      vitals: VitalsModel.fromMap(map['vitals'] as Map<String, dynamic>? ?? {}),
      procedures: List<String>.from(map['procedures'] ?? []),
      createdAt: (map['createdAt'] as Timestamp).toDate(),
    );
  }
}
