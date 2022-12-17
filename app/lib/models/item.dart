class Item {
  String? id = '';
  String title = '';
  String slug = '';
  String description = '';
  String? image = '';

  Item();

  Item.fromJson(Map itemJson) {
    id = itemJson['_id'];
    title = itemJson['title'];
    slug = itemJson['slug'];
    description = itemJson['description'];
    image = itemJson['mainImage'] ?? itemJson['textBoxImage'];
  }

  bool isLoaded() {
    return title.isNotEmpty;
  }
}
