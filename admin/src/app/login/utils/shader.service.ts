import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { environment } from "../../../environments/environment";
import { firstValueFrom, forkJoin } from "rxjs";

@Injectable({
  providedIn: "root",
})
export class ShaderService {
  private readonly http = inject(HttpClient);
  private readonly folder = `${environment.assets}/shader/`;
  private vertex = "";
  private vertexLight = "";
  private fragment = "";
  private fragmentLight = "";
  private foxVertex = "";
  private foxFragment = "";

  public async load(): Promise<boolean> {
    return firstValueFrom(
      forkJoin({
        vertex: this.http.get(`${this.folder}vertex.glsl`, {
          responseType: "text",
        }),
        vertexLight: this.http.get(`${this.folder}vertex-light.glsl`, {
          responseType: "text",
        }),
        fragment: this.http.get(`${this.folder}fragment.glsl`, {
          responseType: "text",
        }),
        fragmentLight: this.http.get(`${this.folder}fragment-light.glsl`, {
          responseType: "text",
        }),
      }),
    )
      .then((response) => {
        this.vertex = response.vertex;
        this.vertexLight = response.vertexLight;
        this.fragment = response.fragment;
        this.fragmentLight = response.fragmentLight;
        return true;
      })
      .catch(() => false);
  }

  /** Loaded independently so a failure does not block the animated background. */
  public async loadFox(): Promise<boolean> {
    return firstValueFrom(
      forkJoin({
        vertex: this.http.get(`${this.folder}fox-face_vert-ready.glsl`, {
          responseType: "text",
        }),
        fragment: this.http.get(`${this.folder}fox-face_frag-ready.glsl`, {
          responseType: "text",
        }),
      }),
    )
      .then((response) => {
        this.foxVertex = response.vertex;
        this.foxFragment = response.fragment;
        return true;
      })
      .catch(() => false);
  }

  public get vertexShader(): string {
    return this.vertex;
  }

  public get vertexLightShader(): string {
    return this.vertexLight;
  }

  public get fragmentShader(): string {
    return this.fragment;
  }

  public get fragmentLightShader(): string {
    return this.fragmentLight;
  }

  public get foxVertexShader(): string {
    return this.foxVertex;
  }

  public get foxFragmentShader(): string {
    return this.foxFragment;
  }
}
