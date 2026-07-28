import 'package:cloud_firestore/cloud_firestore.dart';

class Address {
  final String governorate;
  final String city;
  final String area;
  final String detailedAddress;
  final double latitude;
  final double longitude;

  Address({
    required this.governorate,
    required this.city,
    required this.area,
    required this.detailedAddress,
    required this.latitude,
    required this.longitude,
  });

  Map<String, dynamic> toMap() => {
        'governorate': governorate,
        'city': city,
        'area': area,
        'detailedAddress': detailedAddress,
        'latitude': latitude,
        'longitude': longitude,
      };

  factory Address.fromMap(Map<String, dynamic> map) => Address(
        governorate: map['governorate'] ?? '',
        city: map['city'] ?? '',
        area: map['area'] ?? '',
        detailedAddress: map['detailedAddress'] ?? '',
        latitude: (map['latitude'] as num?)?.toDouble() ?? 0.0,
        longitude: (map['longitude'] as num?)?.toDouble() ?? 0.0,
      );
}

class PatientModel {
  final String patientId;
  final String fullName;
  final String nationalId;
  final String photoUrl;
  final String gender;
  final DateTime dob;
  final String phone;
  final String whatsApp;
  final Address address;
  final List<String> chronicDiseases;
  final List<String> allergies;
  final String bloodType;
  final DateTime createdAt;

  PatientModel({
    required this.patientId,
    required this.fullName,
    required this.nationalId,
    required this.photoUrl,
    required this.gender,
    required this.dob,
    required this.phone,
    required this.whatsApp,
    required this.address,
    required this.chronicDiseases,
    required this.allergies,
    required this.bloodType,
    required this.createdAt,
  });

  int get age {
    final now = DateTime.now();
    int age = now.year - dob.year;
    if (now.month < dob.month || (now.month == dob.month && now.day < dob.day)) {
      age--;
    }
    return age;
  }

  Map<String, dynamic> toMap() => {
        'patientId': patientId,
        'fullName': fullName,
        'nationalId': nationalId,
        'photoUrl': photoUrl,
        'gender': gender,
        'dob': Timestamp.fromDate(dob),
        'phone': phone,
        'whatsApp': whatsApp,
        'address': address.toMap(),
        'medicalHistory': {
          'chronicDiseases': chronicDiseases,
          'allergies': allergies,
          'bloodType': bloodType,
        },
        'createdAt': Timestamp.fromDate(createdAt),
      };

  factory PatientModel.fromMap(Map<String, dynamic> map, String id) {
    final medicalHistory = map['medicalHistory'] as Map<String, dynamic>? ?? {};
    return PatientModel(
      patientId: id,
      fullName: map['fullName'] ?? '',
      nationalId: map['nationalId'] ?? '',
      photoUrl: map['photoUrl'] ?? '',
      gender: map['gender'] ?? 'male',
      dob: (map['dob'] as Timestamp).toDate(),
      phone: map['phone'] ?? '',
      whatsApp: map['whatsApp'] ?? '',
      address: Address.fromMap(map['address'] as Map<String, dynamic>? ?? {}),
      chronicDiseases: List<String>.from(medicalHistory['chronicDiseases'] ?? []),
      allergies: List<String>.from(medicalHistory['allergies'] ?? []),
      bloodType: medicalHistory['bloodType'] ?? 'Unknown',
      createdAt: (map['createdAt'] as Timestamp).toDate(),
    );
  }
}
