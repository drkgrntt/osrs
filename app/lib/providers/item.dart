import 'dart:convert';
import 'package:app/models/item.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

class ItemProvider extends ChangeNotifier {
  final String _rootUrl = "https://osrs.derekgarnett.com";

  Item _item = Item();
  Item get item => _item;
  set item(Item value) {
    _item = value;
    notifyListeners();
  }

  Future<void> randomPage() async {
    final response = await http.get(Uri.parse('$_rootUrl/random'));
    Map<String, dynamic> body = jsonDecode(response.body);
    item = Item.fromJson(body['item']);
  }
}
