import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ItemProvider extends ChangeNotifier {
  final String _rootUrl = "https://osrs.derekgarnett.com";

  dynamic _pageInfo = {};
  dynamic get pageInfo => _pageInfo;
  set pageInfo(dynamic value) {
    _pageInfo = value;
    notifyListeners();
  }

  Future<void> randomPage() async {
    final response = await http.get(Uri.parse('$_rootUrl/random'));

    pageInfo = jsonDecode(response.body);

    debugPrint(pageInfo.toString());
  }
}
