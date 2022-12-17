import 'package:app/providers/item.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/item.dart';

class RandomScreen extends StatelessWidget {
  const RandomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final item = Provider.of<ItemProvider>(context).item;

    return Scaffold(
      appBar: _appBar(item.title),
      body: _body(item),
    );
  }

  AppBar _appBar(String title) {
    return AppBar(
      title: Text(title),
    );
  }

  Widget _body(Item item) {
    return Text(item.description);
  }
}
