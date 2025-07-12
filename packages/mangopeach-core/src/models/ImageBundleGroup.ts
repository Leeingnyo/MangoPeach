export class ImageBundleGroup {
  id: string;
  name: string;
  path: string;
  libraryId: string;
  parentId?: string;

  constructor(
    id: string,
    name: string,
    path: string,
    libraryId: string,
    parentId?: string,
  ) {
    this.id = id;
    this.name = name;
    this.path = path;
    this.libraryId = libraryId;
    this.parentId = parentId;
  }
}
