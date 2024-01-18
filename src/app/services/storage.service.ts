import {Injectable} from "@angular/core";

@Injectable()
export class StorageService {
    private storage: Storage;

    constructor() {
        this.storage = window.localStorage;
    }

    public get(key: string): any {
        return JSON.parse(this.storage.getItem(key) ?? '{}');
    }

    public set(key: string, value: any): void {
        this.storage.setItem(key, JSON.stringify(value));
    }

    public remove(key: string): void {
        this.storage.removeItem(key);
    }

    public clear(): void {
        this.storage.clear();
    }
}
