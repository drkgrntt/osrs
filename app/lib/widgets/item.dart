import 'package:app/models/item.dart';
import 'package:flutter/material.dart';

class ItemDisplay extends StatelessWidget {
  final Item item;
  final onRefresh;

  const ItemDisplay({super.key, required this.item, this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          pinned: true,
          backgroundColor: Colors.teal[800],
          expandedHeight: 200,
          stretch: true,
          onStretchTrigger: () async {
            onRefresh();
          },
          flexibleSpace: FlexibleSpaceBar(
            stretchModes: const <StretchMode>[
              StretchMode.blurBackground,
              StretchMode.fadeTitle,
              StretchMode.zoomBackground,
            ],
            collapseMode: CollapseMode.parallax,
            title: Text(item.title),
            background: DecoratedBox(
              position: DecorationPosition.foreground,
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.bottomCenter,
                  end: Alignment.center,
                  colors: <Color>[
                    Colors.teal[800]!,
                    Colors.transparent,
                  ],
                ),
              ),
              child: Image.network(
                item.image ?? '',
                fit: BoxFit.cover,
              ),
            ),
          ),
        ),
        // Container(),
      ],
    );
  }
}
