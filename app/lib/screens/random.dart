import 'package:app/providers/item.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

class RandomScreen extends StatelessWidget {
  const RandomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    Provider.of<ItemProvider>(context, listen: false).randomPage();

    return Scaffold(
      appBar: _appBar('Penis'),
      body: _body(),
    );
  }

  AppBar _appBar(String title) {
    return AppBar(
      title: Text(title),
    );
  }

  Widget _body() {
    return const Text('Penis');
  }
}
