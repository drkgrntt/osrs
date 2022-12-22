import 'package:app/providers/item.dart';
import 'package:app/widgets/item.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/item.dart';

class RandomScreen extends StatelessWidget {
  const RandomScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final item = Provider.of<ItemProvider>(context).item;

    return Scaffold(
      body: ItemDisplay(
        item: item,
        onRefresh: Provider.of<ItemProvider>(context, listen: false).randomPage,
      ),
    );
  }
}
