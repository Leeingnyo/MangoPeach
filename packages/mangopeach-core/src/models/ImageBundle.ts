import { Tag } from './Tag';

export class ImageBundle {
  id: string;
  type: 'zip' | 'rar' | 'directory';
  name: string;
  path: string;
  libraryId: string;
  pageCount: number;
  coverImage: string;
  displayName: string;
  sortingName: string;
  tags: Tag[];
  createdAt: Date;
  modifiedAt: Date;
  scannedAt: Date;

  constructor(
    id: string,
    type: 'zip' | 'rar' | 'directory',
    name: string,
    path: string,
    libraryId: string,
    pageCount: number,
    modifiedAt: Date,
  ) {
    this.id = id;
    this.type = type;
    this.name = name;
    this.path = path;
    this.libraryId = libraryId;
    this.pageCount = pageCount;
    this.modifiedAt = modifiedAt;

    // Default values
    this.displayName = name;
    this.sortingName = name;
    this.tags = [];
    this.createdAt = new Date();
    this.scannedAt = new Date();
    this.coverImage = ''; // This can be updated later
  }
}
