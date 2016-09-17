﻿import file_access_module = require("file-system/file-system-access");
import * as platformModule from "platform";

// The FileSystemAccess implementation, used through all the APIs.
var fileAccess;
var getFileAccess = function (): file_access_module.FileSystemAccess {
    if (!fileAccess) {
        fileAccess = new file_access_module.FileSystemAccess();
    }

    return fileAccess;
};

let platform: typeof platformModule;
function ensurePlatform() {
    if (!platform) {
        platform = require("platform");
    }
}

// we are defining these as private variables within the IO scope and will use them to access the corresponding properties for each FSEntity instance.
// this allows us to encapsulate (hide) the explicit property setters and force the users go through the exposed APIs to receive FSEntity instances.
var nameProperty = "_name";
var pathProperty = "_path";
var isKnownProperty = "_isKnown";
var fileLockedProperty = "_locked";
var extensionProperty = "_extension";
var lastModifiedProperty = "_lastModified";

var createFile = function (info: { path: string; name: string; extension: string }) {
    var file = new File();
    file[pathProperty] = info.path;
    file[nameProperty] = info.name;
    file[extensionProperty] = info.extension;

    return file;
};

var createFolder = function (info: { path: string; name: string; }) {
    var documents = knownFolders.documents();
    if (info.path === documents.path) {
        return documents;
    }

    var temp = knownFolders.temp();
    if (info.path === temp.path) {
        return temp;
    }

    var folder = new Folder();

    folder[pathProperty] = info.path;
    folder[nameProperty] = info.name;

    return folder;
};

export class FileSystemEntity {
    get parent(): Folder {
        var onError = function (error) {
            throw error;
        }

        var folderInfo = getFileAccess().getParent(this.path, onError);
        if (!folderInfo) {
            return undefined;
        }

        return createFolder(folderInfo);
    }

    public remove(): Promise<any> {
        return new Promise((resolve, reject) => {
            var hasError = false;
            var localError = function (error: any) {
                hasError = true;
                reject(error);
            };

            this.removeSync(localError);
            if (!hasError) {
                resolve();
            }
        });
    }

    public removeSync(onError?: (error: any) => any): void {
        if (this[isKnownProperty]) {
            if (onError) {
                onError({ message: "Cannot delete known folder." });
            }

            return;
        }

        var fileAccess = getFileAccess();

        if (this instanceof File) {
            fileAccess.deleteFile(this.path, onError);
        } else if (this instanceof Folder) {
            fileAccess.deleteFolder(this.path, onError);
        }
    }

    public rename(newName: string): Promise<any> {
        return new Promise((resolve, reject) => {
            var hasError = false;
            var localError = function (error) {
                hasError = true;
                reject(error);
            }

            this.renameSync(newName, localError);

            if (!hasError) {
                resolve();
            }
        });
    }

    public renameSync(newName: string, onError?: (error: any) => any): void {
        if (this[isKnownProperty]) {
            if (onError) {
                onError(new Error("Cannot rename known folder."));
            }
            return;
        }

        var parentFolder = this.parent;
        if (!parentFolder) {
            if (onError) {
                onError(new Error("No parent folder."));
            }
            return;
        }

        var fileAccess = getFileAccess();
        var path = parentFolder.path;
        var newPath = fileAccess.joinPath(path, newName);

        var hasError = false;
        var localError = function (error) {
            hasError = true;
            if (onError) {
                onError(error);
            }
            return null;
        }

        fileAccess.rename(this.path, newPath, localError);
        this[pathProperty] = newPath;
        this[nameProperty] = newName;

        if (this instanceof File) {
            this[extensionProperty] = fileAccess.getFileExtension(newPath);
        }
    }

    get name(): string {
        return this[nameProperty];
    }

    get path(): string {
        return this[pathProperty];
    }

    get lastModified(): Date {
        var value = this[lastModifiedProperty];
        if (!this[lastModifiedProperty]) {
            value = this[lastModifiedProperty] = getFileAccess().getLastModified(this.path);
        }

        return value;
    }
}

export class File extends FileSystemEntity {
    public static fromPath(path: string) {
        var onError = function (error) {
            throw error;
        }

        var fileInfo = getFileAccess().getFile(path, onError);
        if (!fileInfo) {
            return undefined;
        }

        return createFile(fileInfo);
    }

    public static exists(path: string): boolean {
        return getFileAccess().fileExists(path);
    }

    get extension(): string {
        return this[extensionProperty];
    }

    get isLocked(): boolean {
        // !! is a boolean conversion/cast, handling undefined as well
        return !!this[fileLockedProperty];
    }

    public readSync(onError?: (error: any) => any): any {
        this.checkAccess();

        this[fileLockedProperty] = true;

        var that = this;
        var localError = (error) => {
            that[fileLockedProperty] = false;
            if (onError) {
                onError(error);
            }
        };

        var content = getFileAccess().read(this.path, localError);

        this[fileLockedProperty] = false;

        return content;

    }

    public writeSync(content: any, onError?: (error: any) => any): void {
        this.checkAccess();

        try {
            this[fileLockedProperty] = true;

            var that = this;
            var localError = function (error) {
                that[fileLockedProperty] = false;
                if (onError) {
                    onError(error);
                }
            };

            getFileAccess().write(this.path, content, localError);
        } finally {
            this[fileLockedProperty] = false;
        }
    }

    public readText(encoding?: string): Promise<string> {
        return new Promise((resolve, reject) => {
            var hasError = false;
            var localError = (error) => {
                hasError = true;
                reject(error);
            };

            var content = this.readTextSync(localError, encoding);
            if (!hasError) {
                resolve(content);
            }
        });
    }

    public readTextSync(onError?: (error: any) => any, encoding?: string): string {
        this.checkAccess();

        this[fileLockedProperty] = true;

        var that = this;
        var localError = (error) => {
            that[fileLockedProperty] = false;
            if (onError) {
                onError(error);
            }
        };

        var content = getFileAccess().readText(this.path, localError, encoding);
        this[fileLockedProperty] = false;

        return content;
    }

    public writeText(content: string, encoding?: string): Promise<any> {
        return new Promise((resolve, reject) => {
            var hasError = false;
            var localError = function (error) {
                hasError = true;
                reject(error);
            };

            this.writeTextSync(content, localError, encoding);
            if (!hasError) {
                resolve();
            }
        });
    }

    public writeTextSync(content: string, onError?: (error: any) => any, encoding?: string): void {
        this.checkAccess();

        try {
            this[fileLockedProperty] = true;

            var that = this;
            var localError = function (error) {
                that[fileLockedProperty] = false;
                if (onError) {
                    onError(error);
                }
            };
    
            // TODO: Asyncronous
            getFileAccess().writeText(this.path, content, localError, encoding);
        } finally {
            this[fileLockedProperty] = false;
        }
    }

    private checkAccess() {
        if (this.isLocked) {
            throw new Error("Cannot access a locked file.");
        }
    }
}

export class Folder extends FileSystemEntity {
    public static fromPath(path: string): Folder {
        var onError = function (error) {
            throw error;
        }

        var folderInfo = getFileAccess().getFolder(path, onError);
        if (!folderInfo) {
            return undefined;
        }

        return createFolder(folderInfo);
    }

    public static exists(path: string): boolean {
        return getFileAccess().folderExists(path);
    }

    public contains(name: string): boolean {
        var fileAccess = getFileAccess();
        var path = fileAccess.joinPath(this.path, name);

        if (fileAccess.fileExists(path)) {
            return true;
        }

        return fileAccess.folderExists(path);
    }

    public clear(): Promise<any> {
        return new Promise((resolve, reject) => {
            var hasError = false;
            var onError = function (error) {
                hasError = true;
                reject(error);
            };

            this.clearSync(onError);
            if (!hasError) {
                resolve();
            }
        });
    }

    public clearSync(onError?: (error: any) => void): void {
        getFileAccess().emptyFolder(this.path, onError);
    }

    get isKnown(): boolean {
        return this[isKnownProperty];
    }

    public getFile(name: string): File {
        var fileAccess = getFileAccess();
        var path = fileAccess.joinPath(this.path, name);

        var onError = function (error) {
            throw error;
        }

        var fileInfo = fileAccess.getFile(path, onError);
        if (!fileInfo) {
            return undefined;
        }

        return createFile(fileInfo);
    }

    public getFolder(name: string): Folder {
        var fileAccess = getFileAccess();
        var path = fileAccess.joinPath(this.path, name);

        var onError = function (error) {
            throw error;
        }

        var folderInfo = fileAccess.getFolder(path, onError);
        if (!folderInfo) {
            return undefined;
        }

        return createFolder(folderInfo);
    }

    public getEntities(): Promise<Array<FileSystemEntity>> {
        return new Promise((resolve, reject) => {
            var hasError = false;
            var localError = function (error) {
                hasError = true;
                reject(error);
            };

            var entities = this.getEntitiesSync(localError);
            if (!hasError) {
                resolve(entities);
            }
        });
    }

    public getEntitiesSync(onError?: (error: any) => any): Array<FileSystemEntity> {
        var fileInfos = getFileAccess().getEntities(this.path, onError);
        if (!fileInfos) {
            return null;
        }

        var entities = new Array<FileSystemEntity>();

        var i;
        for (i = 0; i < fileInfos.length; i++) {
            if (fileInfos[i].extension) {
                entities.push(createFile(fileInfos[i]));
            } else {
                entities.push(createFolder(fileInfos[i]));
            }
        }

        return entities;
    }

    public eachEntity(onEntity: (entity: FileSystemEntity) => boolean) {
        if (!onEntity) {
            return;
        }

        var onSuccess = function (fileInfo: { path: string; name: string; extension: string }): boolean {
            var entity;
            if (fileInfo.extension) {
                entity = createFile(fileInfo);
            } else {
                entity = createFolder(fileInfo);
            }

            return onEntity(entity);
        }

        var onError = function (error) {
            throw error;
        }

        getFileAccess().eachEntity(this.path, onSuccess, onError);
    }
}

export module knownFolders {
    var _documents: Folder;
    var _temp: Folder;
    var _app: Folder;

    export var documents = function (): Folder {
        if (!_documents) {
            var path = getFileAccess().getDocumentsFolderPath();
            _documents = new Folder();
            _documents[pathProperty] = path;
            _documents[isKnownProperty] = true;
        }

        return _documents;
    };

    export var temp = function (): Folder {
        if (!_temp) {
            var path = getFileAccess().getTempFolderPath();
            _temp = new Folder();
            _temp[pathProperty] = path;
            _temp[isKnownProperty] = true;
        }

        return _temp;
    };

    export var currentApp = function (): Folder {
        if (!_app) {
            var path = getFileAccess().getCurrentAppPath();
            _app = new Folder();
            _app[pathProperty] = path;
            _app[isKnownProperty] = true;
        }

        return _app;
    };
    
    export module ios {
        function _checkPlatform(knownFolderName: string){
            ensurePlatform();
            if (!platform.isIOS){
                throw new Error(`The "${knownFolderName}" known folder is available on iOS only!`);
            }            
        }
        
        let _library: Folder;
        export var library = function(): Folder {
            _checkPlatform("library");
            if (!_library) {
                var path = (<any>getFileAccess()).getKnownPath(NSSearchPathDirectory.LibraryDirectory);
                _library = Folder.fromPath(path);
                _library[pathProperty] = path;
                _library[isKnownProperty] = true;
            }

            return _library;
        };
        
        let _developer: Folder;
        export var developer = function(): Folder {
            _checkPlatform("developer");
            if (!_developer) {
                var path = (<any>getFileAccess()).getKnownPath(NSSearchPathDirectory.DeveloperDirectory);
                _developer = Folder.fromPath(path);
                _developer[pathProperty] = path;
                _developer[isKnownProperty] = true;
            }

            return _developer;
        };
        
        let _desktop: Folder;
        export var desktop = function(): Folder {
            _checkPlatform("desktop");
            if (!_desktop) {
                var path = (<any>getFileAccess()).getKnownPath(NSSearchPathDirectory.DesktopDirectory);
                _desktop = Folder.fromPath(path);
                _desktop[pathProperty] = path;
                _desktop[isKnownProperty] = true;
            }

            return _desktop;
        };
        
        let _downloads: Folder;
        export var downloads = function(): Folder {
            _checkPlatform("downloads");
            if (!_downloads) {
                var path = (<any>getFileAccess()).getKnownPath(NSSearchPathDirectory.DownloadsDirectory);
                _downloads = Folder.fromPath(path);
                _downloads[pathProperty] = path;
                _downloads[isKnownProperty] = true;
            }

            return _downloads;
        };
        
        let _movies: Folder;
        export var movies = function(): Folder {
            _checkPlatform("movies");
            if (!_movies) {
                var path = (<any>getFileAccess()).getKnownPath(NSSearchPathDirectory.MoviesDirectory);
                _movies = Folder.fromPath(path);
                _movies[pathProperty] = path;
                _movies[isKnownProperty] = true;
            }

            return _movies;
        };
        
        let _music: Folder;
        export var music = function(): Folder {
            _checkPlatform("music");
            if (!_music) {
                var path = (<any>getFileAccess()).getKnownPath(NSSearchPathDirectory.MusicDirectory);
                _music = Folder.fromPath(path);
                _music[pathProperty] = path;
                _music[isKnownProperty] = true;
            }

            return _music;
        };

        let _pictures: Folder;
        export var pictures = function(): Folder {
            _checkPlatform("pictures");
            if (!_pictures) {
                var path = (<any>getFileAccess()).getKnownPath(NSSearchPathDirectory.PicturesDirectory);
                _pictures = Folder.fromPath(path);
                _pictures[pathProperty] = path;
                _pictures[isKnownProperty] = true;
            }

            return _pictures;
        };

        let _sharedPublic: Folder;
        export var sharedPublic = function(): Folder {
            _checkPlatform("sharedPublic");
            if (!_sharedPublic) {
                var path = (<any>getFileAccess()).getKnownPath(NSSearchPathDirectory.SharedPublicDirectory);
                _sharedPublic = Folder.fromPath(path);
                _sharedPublic[pathProperty] = path;
                _sharedPublic[isKnownProperty] = true;
            }

            return _sharedPublic;
        };
    }
}

export module path {

    export function normalize(path: string): string {
        return getFileAccess().normalizePath(path);
    }

    export function join(...paths: string[]): string {
        var fileAccess = getFileAccess();
        return fileAccess.joinPaths(paths);
    }

    export var separator = getFileAccess().getPathSeparator();
}
