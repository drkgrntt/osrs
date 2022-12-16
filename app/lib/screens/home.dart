import 'package:app/screens/random.dart';
import 'package:flutter/material.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(appBar: _appBar(), body: _body(context));
  }

  AppBar _appBar() {
    return AppBar(
      title: const Text('OSRS Wiki'),
    );
  }

  Widget _body(BuildContext context) {
    return Center(
      child: ElevatedButton(
        child: const Text('Random Ass Page'),
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (BuildContext context) {
                return const RandomScreen();
              },
            ),
          );
        },
      ),
    );
  }
}
