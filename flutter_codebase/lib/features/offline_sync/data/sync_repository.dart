import 'package:cloud_firestore/cloud_firestore.dart';

enum SyncOperation { create, update, delete }

class SyncQueueItem {
  final String id;
  final String collection;
  final String documentId;
  final SyncOperation operation;
  final Map<String, dynamic> payload;
  final DateTime createdAt;

  SyncQueueItem({
    required this.id,
    required this.collection,
    required this.documentId,
    required this.operation,
    required this.payload,
    required this.createdAt,
  });
}

class OfflineFirstSyncRepository {
  final FirebaseFirestore _firestore;
  final List<SyncQueueItem> _localQueue = [];

  OfflineFirstSyncRepository(this._firestore);

  /// Saves visit locally first, then attempts online sync
  Future<void> saveVisitOfflineFirst({
    required String patientId,
    required String visitId,
    required Map<String, dynamic> visitData,
    required bool isOnline,
  }) async {
    final docRef = _firestore
        .collection('patients')
        .doc(patientId)
        .collection('visits')
        .doc(visitId);

    if (isOnline) {
      try {
        await docRef.set(visitData, SetOptions(merge: true));
        print('Visit uploaded directly to Firestore.');
      } catch (e) {
        _queueLocally(patientId, visitId, visitData);
      }
    } else {
      _queueLocally(patientId, visitId, visitData);
    }
  }

  void _queueLocally(String patientId, String visitId, Map<String, dynamic> visitData) {
    _localQueue.add(
      SyncQueueItem(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        collection: 'patients/$patientId/visits',
        documentId: visitId,
        operation: SyncOperation.create,
        payload: visitData,
        createdAt: DateTime.now(),
      ),
    );
    print('Visit queued in offline storage.');
  }

  /// Flushes pending offline transactions when internet restores
  Future<void> flushQueue() async {
    if (_localQueue.isEmpty) return;

    final batch = _firestore.batch();
    final itemsToRemove = <SyncQueueItem>[];

    for (final item in _localQueue) {
      final docRef = _firestore.collection(item.collection).doc(item.documentId);
      batch.set(docRef, item.payload, SetOptions(merge: true));
      itemsToRemove.add(item);
    }

    try {
      await batch.commit();
      _localQueue.removeWhere((element) => itemsToRemove.contains(element));
      print('Offline sync queue successfully flushed to Cloud Firestore.');
    } catch (e) {
      print('Batch sync error: $e');
    }
  }
}
