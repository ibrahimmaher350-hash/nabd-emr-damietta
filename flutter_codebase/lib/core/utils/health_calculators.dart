class HealthCalculators {
  /// Calculates Age from Date of Birth
  static int calculateAge(DateTime dob) {
    final today = DateTime.now();
    int age = today.year - dob.year;
    if (today.month < dob.month || (today.month == dob.month && today.day < dob.day)) {
      age--;
    }
    return age;
  }

  /// Calculates Body Mass Index (BMI)
  /// Returns a tuple of (bmiValue, categoryArabicText)
  static (double, String) calculateBMI(double weightKg, double heightCm) {
    if (heightCm <= 0 || weightKg <= 0) return (0.0, "غير محدد");

    final heightMeters = heightCm / 100.0;
    final bmi = weightKg / (heightMeters * heightMeters);
    final roundedBmi = double.parse(bmi.toStringAsFixed(2));

    String category;
    if (roundedBmi < 18.5) {
      category = "نقص في الوزن";
    } else if (roundedBmi >= 18.5 && roundedBmi < 24.9) {
      category = "وزن طبيعي";
    } else if (roundedBmi >= 25.0 && roundedBmi < 29.9) {
      category = "زيادة في الوزن";
    } else if (roundedBmi >= 30.0 && roundedBmi < 34.9) {
      category = "سمنة - الدرجة الأولى";
    } else if (roundedBmi >= 35.0 && roundedBmi < 39.9) {
      category = "سمنة - الدرجة الثانية";
    } else {
      category = "سمنة مفرطة";
    }

    return (roundedBmi, category);
  }
}
