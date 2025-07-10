export class ImageBundleDetails {
  id: string;
  pages: string[]; // Sorted list of page file names/paths within the bundle

  constructor(id: string, pages: string[]) {
    this.id = id;
    this.pages = pages;
  }
}
