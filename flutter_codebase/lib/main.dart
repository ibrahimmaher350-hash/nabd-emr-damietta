import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const NabdHomeNursingApp());
}

class NabdHomeNursingApp extends StatelessWidget {
  const NabdHomeNursingApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'نبض - نظام التمريض المنزلي EMR',
      debugShowCheckedModeBanner: false,
      locale: const Locale('ar', 'EG'),
      supportedLocales: const [
        Locale('ar', 'EG'),
        Locale('en', 'US'),
      ],
      localizationsDelegates: const [
        GlobalMaterialLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
      ],
      theme: ThemeData(
        fontFamily: 'Cairo',
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0B192C),
          primary: const Color(0xFF00D4B2),
          secondary: const Color(0xFFFF9F43),
          surface: const Color(0xFF14243B),
        ),
        scaffoldBackgroundColor: const Color(0xFF070F1A),
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('نبض | نظام التمريض المنزلي EMR'),
        backgroundColor: const Color(0xFF0B192C),
        foregroundColor: Colors.white,
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Image.asset('assets/logo.png', width: 120, height: 120),
            const SizedBox(height: 20),
            const Text(
              'أهلاً بك في نظام نبض للتمريض المنزلي والسجل الطبي',
              style: TextStyle(fontSize: 18, color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      ),
    );
  }
}
