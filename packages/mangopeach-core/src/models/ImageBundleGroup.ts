import { ImageBundle } from './ImageBundle';

export class ImageBundleGroup {
  id: string;
  name: string;
  path: string;
  libraryId: string;
  bundles: ImageBundle[];
  subGroups: ImageBundleGroup[];

  constructor(
    id: string,
    name: string,
    path: string,
    libraryId: string,
  ) {
    this.id = id;
    this.name = name;
    this.path = path;
    this.libraryId = libraryId;
    this.bundles = [];
    this.subGroups = [];
  }
}
