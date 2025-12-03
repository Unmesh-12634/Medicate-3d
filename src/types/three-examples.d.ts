declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
  import { Loader } from 'three';
  import { LoadingManager } from 'three';
  import { Group } from 'three';
  export class GLTFLoader extends Loader {
    constructor(manager?: LoadingManager);
    load(
      url: string,
      onLoad: (gltf: any) => void,
      onProgress?: (event: ProgressEvent<EventTarget>) => void,
      onError?: (event: unknown) => void
    ): void;
  }
}
