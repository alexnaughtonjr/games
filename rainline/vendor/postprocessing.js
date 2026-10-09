/* Three.js r159 postprocessing (EffectComposer, RenderPass, UnrealBloomPass, OutputPass).
 * MIT License. Copyright (c) 2010-2023 three.js authors.
 * Bundled for the vendored global THREE build. Not loaded from a CDN.
 */
(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));

  // three-global:three
  var require_three = __commonJS({
    "three-global:three"(exports, module) {
      module.exports = globalThis.THREE;
    }
  });

  // three/examples/jsm/postprocessing/EffectComposer.js
  var import_three3 = __toESM(require_three(), 1);

  // three/examples/jsm/shaders/CopyShader.js
  var CopyShader = {
    name: "CopyShader",
    uniforms: {
      "tDiffuse": { value: null },
      "opacity": { value: 1 }
    },
    vertexShader: (
      /* glsl */
      `

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`
    ),
    fragmentShader: (
      /* glsl */
      `

		uniform float opacity;

		uniform sampler2D tDiffuse;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );
			gl_FragColor = opacity * texel;


		}`
    )
  };

  // three/examples/jsm/postprocessing/ShaderPass.js
  var import_three2 = __toESM(require_three(), 1);

  // three/examples/jsm/postprocessing/Pass.js
  var import_three = __toESM(require_three(), 1);
  var Pass = class {
    constructor() {
      this.isPass = true;
      this.enabled = true;
      this.needsSwap = true;
      this.clear = false;
      this.renderToScreen = false;
    }
    setSize() {
    }
    render() {
      console.error("THREE.Pass: .render() must be implemented in derived pass.");
    }
    dispose() {
    }
  };
  var _camera = new import_three.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var FullscreenTriangleGeometry = class extends import_three.BufferGeometry {
    constructor() {
      super();
      this.setAttribute("position", new import_three.Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
      this.setAttribute("uv", new import_three.Float32BufferAttribute([0, 2, 0, 0, 2, 0], 2));
    }
  };
  var _geometry = new FullscreenTriangleGeometry();
  var FullScreenQuad = class {
    constructor(material) {
      this._mesh = new import_three.Mesh(_geometry, material);
    }
    dispose() {
      this._mesh.geometry.dispose();
    }
    render(renderer) {
      renderer.render(this._mesh, _camera);
    }
    get material() {
      return this._mesh.material;
    }
    set material(value) {
      this._mesh.material = value;
    }
  };

  // three/examples/jsm/postprocessing/ShaderPass.js
  var ShaderPass = class extends Pass {
    constructor(shader, textureID) {
      super();
      this.textureID = textureID !== void 0 ? textureID : "tDiffuse";
      if (shader instanceof import_three2.ShaderMaterial) {
        this.uniforms = shader.uniforms;
        this.material = shader;
      } else if (shader) {
        this.uniforms = import_three2.UniformsUtils.clone(shader.uniforms);
        this.material = new import_three2.ShaderMaterial({
          name: shader.name !== void 0 ? shader.name : "unspecified",
          defines: Object.assign({}, shader.defines),
          uniforms: this.uniforms,
          vertexShader: shader.vertexShader,
          fragmentShader: shader.fragmentShader
        });
      }
      this.fsQuad = new FullScreenQuad(this.material);
    }
    render(renderer, writeBuffer, readBuffer) {
      if (this.uniforms[this.textureID]) {
        this.uniforms[this.textureID].value = readBuffer.texture;
      }
      this.fsQuad.material = this.material;
      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
        this.fsQuad.render(renderer);
      } else {
        renderer.setRenderTarget(writeBuffer);
        if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
        this.fsQuad.render(renderer);
      }
    }
    dispose() {
      this.material.dispose();
      this.fsQuad.dispose();
    }
  };

  // three/examples/jsm/postprocessing/MaskPass.js
  var MaskPass = class extends Pass {
    constructor(scene, camera) {
      super();
      this.scene = scene;
      this.camera = camera;
      this.clear = true;
      this.needsSwap = false;
      this.inverse = false;
    }
    render(renderer, writeBuffer, readBuffer) {
      const context = renderer.getContext();
      const state = renderer.state;
      state.buffers.color.setMask(false);
      state.buffers.depth.setMask(false);
      state.buffers.color.setLocked(true);
      state.buffers.depth.setLocked(true);
      let writeValue, clearValue;
      if (this.inverse) {
        writeValue = 0;
        clearValue = 1;
      } else {
        writeValue = 1;
        clearValue = 0;
      }
      state.buffers.stencil.setTest(true);
      state.buffers.stencil.setOp(context.REPLACE, context.REPLACE, context.REPLACE);
      state.buffers.stencil.setFunc(context.ALWAYS, writeValue, 4294967295);
      state.buffers.stencil.setClear(clearValue);
      state.buffers.stencil.setLocked(true);
      renderer.setRenderTarget(readBuffer);
      if (this.clear) renderer.clear();
      renderer.render(this.scene, this.camera);
      renderer.setRenderTarget(writeBuffer);
      if (this.clear) renderer.clear();
      renderer.render(this.scene, this.camera);
      state.buffers.color.setLocked(false);
      state.buffers.depth.setLocked(false);
      state.buffers.color.setMask(true);
      state.buffers.depth.setMask(true);
      state.buffers.stencil.setLocked(false);
      state.buffers.stencil.setFunc(context.EQUAL, 1, 4294967295);
      state.buffers.stencil.setOp(context.KEEP, context.KEEP, context.KEEP);
      state.buffers.stencil.setLocked(true);
    }
  };
  var ClearMaskPass = class extends Pass {
    constructor() {
      super();
      this.needsSwap = false;
    }
    render(renderer) {
      renderer.state.buffers.stencil.setLocked(false);
      renderer.state.buffers.stencil.setTest(false);
    }
  };

  // three/examples/jsm/postprocessing/EffectComposer.js
  var EffectComposer = class {
    constructor(renderer, renderTarget) {
      this.renderer = renderer;
      this._pixelRatio = renderer.getPixelRatio();
      if (renderTarget === void 0) {
        const size = renderer.getSize(new import_three3.Vector2());
        this._width = size.width;
        this._height = size.height;
        renderTarget = new import_three3.WebGLRenderTarget(this._width * this._pixelRatio, this._height * this._pixelRatio, { type: import_three3.HalfFloatType });
        renderTarget.texture.name = "EffectComposer.rt1";
      } else {
        this._width = renderTarget.width;
        this._height = renderTarget.height;
      }
      this.renderTarget1 = renderTarget;
      this.renderTarget2 = renderTarget.clone();
      this.renderTarget2.texture.name = "EffectComposer.rt2";
      this.writeBuffer = this.renderTarget1;
      this.readBuffer = this.renderTarget2;
      this.renderToScreen = true;
      this.passes = [];
      this.copyPass = new ShaderPass(CopyShader);
      this.copyPass.material.blending = import_three3.NoBlending;
      this.clock = new import_three3.Clock();
    }
    swapBuffers() {
      const tmp = this.readBuffer;
      this.readBuffer = this.writeBuffer;
      this.writeBuffer = tmp;
    }
    addPass(pass) {
      this.passes.push(pass);
      pass.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
    }
    insertPass(pass, index) {
      this.passes.splice(index, 0, pass);
      pass.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
    }
    removePass(pass) {
      const index = this.passes.indexOf(pass);
      if (index !== -1) {
        this.passes.splice(index, 1);
      }
    }
    isLastEnabledPass(passIndex) {
      for (let i = passIndex + 1; i < this.passes.length; i++) {
        if (this.passes[i].enabled) {
          return false;
        }
      }
      return true;
    }
    render(deltaTime) {
      if (deltaTime === void 0) {
        deltaTime = this.clock.getDelta();
      }
      const currentRenderTarget = this.renderer.getRenderTarget();
      let maskActive = false;
      for (let i = 0, il = this.passes.length; i < il; i++) {
        const pass = this.passes[i];
        if (pass.enabled === false) continue;
        pass.renderToScreen = this.renderToScreen && this.isLastEnabledPass(i);
        pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive);
        if (pass.needsSwap) {
          if (maskActive) {
            const context = this.renderer.getContext();
            const stencil = this.renderer.state.buffers.stencil;
            stencil.setFunc(context.NOTEQUAL, 1, 4294967295);
            this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime);
            stencil.setFunc(context.EQUAL, 1, 4294967295);
          }
          this.swapBuffers();
        }
        if (MaskPass !== void 0) {
          if (pass instanceof MaskPass) {
            maskActive = true;
          } else if (pass instanceof ClearMaskPass) {
            maskActive = false;
          }
        }
      }
      this.renderer.setRenderTarget(currentRenderTarget);
    }
    reset(renderTarget) {
      if (renderTarget === void 0) {
        const size = this.renderer.getSize(new import_three3.Vector2());
        this._pixelRatio = this.renderer.getPixelRatio();
        this._width = size.width;
        this._height = size.height;
        renderTarget = this.renderTarget1.clone();
        renderTarget.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
      }
      this.renderTarget1.dispose();
      this.renderTarget2.dispose();
      this.renderTarget1 = renderTarget;
      this.renderTarget2 = renderTarget.clone();
      this.writeBuffer = this.renderTarget1;
      this.readBuffer = this.renderTarget2;
    }
    setSize(width, height) {
      this._width = width;
      this._height = height;
      const effectiveWidth = this._width * this._pixelRatio;
      const effectiveHeight = this._height * this._pixelRatio;
      this.renderTarget1.setSize(effectiveWidth, effectiveHeight);
      this.renderTarget2.setSize(effectiveWidth, effectiveHeight);
      for (let i = 0; i < this.passes.length; i++) {
        this.passes[i].setSize(effectiveWidth, effectiveHeight);
      }
    }
    setPixelRatio(pixelRatio) {
      this._pixelRatio = pixelRatio;
      this.setSize(this._width, this._height);
    }
    dispose() {
      this.renderTarget1.dispose();
      this.renderTarget2.dispose();
      this.copyPass.dispose();
    }
  };

  // three/examples/jsm/postprocessing/RenderPass.js
  var import_three4 = __toESM(require_three(), 1);
  var RenderPass = class extends Pass {
    constructor(scene, camera, overrideMaterial = null, clearColor = null, clearAlpha = null) {
      super();
      this.scene = scene;
      this.camera = camera;
      this.overrideMaterial = overrideMaterial;
      this.clearColor = clearColor;
      this.clearAlpha = clearAlpha;
      this.clear = true;
      this.clearDepth = false;
      this.needsSwap = false;
      this._oldClearColor = new import_three4.Color();
    }
    render(renderer, writeBuffer, readBuffer) {
      const oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      let oldClearAlpha, oldOverrideMaterial;
      if (this.overrideMaterial !== null) {
        oldOverrideMaterial = this.scene.overrideMaterial;
        this.scene.overrideMaterial = this.overrideMaterial;
      }
      if (this.clearColor !== null) {
        renderer.getClearColor(this._oldClearColor);
        renderer.setClearColor(this.clearColor);
      }
      if (this.clearAlpha !== null) {
        oldClearAlpha = renderer.getClearAlpha();
        renderer.setClearAlpha(this.clearAlpha);
      }
      if (this.clearDepth == true) {
        renderer.clearDepth();
      }
      renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
      if (this.clear === true) {
        renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
      }
      renderer.render(this.scene, this.camera);
      if (this.clearColor !== null) {
        renderer.setClearColor(this._oldClearColor);
      }
      if (this.clearAlpha !== null) {
        renderer.setClearAlpha(oldClearAlpha);
      }
      if (this.overrideMaterial !== null) {
        this.scene.overrideMaterial = oldOverrideMaterial;
      }
      renderer.autoClear = oldAutoClear;
    }
  };

  // three/examples/jsm/postprocessing/UnrealBloomPass.js
  var import_three6 = __toESM(require_three(), 1);

  // three/examples/jsm/shaders/LuminosityHighPassShader.js
  var import_three5 = __toESM(require_three(), 1);
  var LuminosityHighPassShader = {
    name: "LuminosityHighPassShader",
    shaderID: "luminosityHighPass",
    uniforms: {
      "tDiffuse": { value: null },
      "luminosityThreshold": { value: 1 },
      "smoothWidth": { value: 1 },
      "defaultColor": { value: new import_three5.Color(0) },
      "defaultOpacity": { value: 0 }
    },
    vertexShader: (
      /* glsl */
      `

		varying vec2 vUv;

		void main() {

			vUv = uv;

			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`
    ),
    fragmentShader: (
      /* glsl */
      `

		uniform sampler2D tDiffuse;
		uniform vec3 defaultColor;
		uniform float defaultOpacity;
		uniform float luminosityThreshold;
		uniform float smoothWidth;

		varying vec2 vUv;

		void main() {

			vec4 texel = texture2D( tDiffuse, vUv );

			vec3 luma = vec3( 0.299, 0.587, 0.114 );

			float v = dot( texel.xyz, luma );

			vec4 outputColor = vec4( defaultColor.rgb, defaultOpacity );

			float alpha = smoothstep( luminosityThreshold, luminosityThreshold + smoothWidth, v );

			gl_FragColor = mix( outputColor, texel, alpha );

		}`
    )
  };

  // three/examples/jsm/postprocessing/UnrealBloomPass.js
  var UnrealBloomPass = class _UnrealBloomPass extends Pass {
    constructor(resolution, strength, radius, threshold) {
      super();
      this.strength = strength !== void 0 ? strength : 1;
      this.radius = radius;
      this.threshold = threshold;
      this.resolution = resolution !== void 0 ? new import_three6.Vector2(resolution.x, resolution.y) : new import_three6.Vector2(256, 256);
      this.clearColor = new import_three6.Color(0, 0, 0);
      this.renderTargetsHorizontal = [];
      this.renderTargetsVertical = [];
      this.nMips = 5;
      let resx = Math.round(this.resolution.x / 2);
      let resy = Math.round(this.resolution.y / 2);
      this.renderTargetBright = new import_three6.WebGLRenderTarget(resx, resy, { type: import_three6.HalfFloatType });
      this.renderTargetBright.texture.name = "UnrealBloomPass.bright";
      this.renderTargetBright.texture.generateMipmaps = false;
      for (let i = 0; i < this.nMips; i++) {
        const renderTargetHorizonal = new import_three6.WebGLRenderTarget(resx, resy, { type: import_three6.HalfFloatType });
        renderTargetHorizonal.texture.name = "UnrealBloomPass.h" + i;
        renderTargetHorizonal.texture.generateMipmaps = false;
        this.renderTargetsHorizontal.push(renderTargetHorizonal);
        const renderTargetVertical = new import_three6.WebGLRenderTarget(resx, resy, { type: import_three6.HalfFloatType });
        renderTargetVertical.texture.name = "UnrealBloomPass.v" + i;
        renderTargetVertical.texture.generateMipmaps = false;
        this.renderTargetsVertical.push(renderTargetVertical);
        resx = Math.round(resx / 2);
        resy = Math.round(resy / 2);
      }
      const highPassShader = LuminosityHighPassShader;
      this.highPassUniforms = import_three6.UniformsUtils.clone(highPassShader.uniforms);
      this.highPassUniforms["luminosityThreshold"].value = threshold;
      this.highPassUniforms["smoothWidth"].value = 0.01;
      this.materialHighPassFilter = new import_three6.ShaderMaterial({
        uniforms: this.highPassUniforms,
        vertexShader: highPassShader.vertexShader,
        fragmentShader: highPassShader.fragmentShader
      });
      this.separableBlurMaterials = [];
      const kernelSizeArray = [3, 5, 7, 9, 11];
      resx = Math.round(this.resolution.x / 2);
      resy = Math.round(this.resolution.y / 2);
      for (let i = 0; i < this.nMips; i++) {
        this.separableBlurMaterials.push(this.getSeperableBlurMaterial(kernelSizeArray[i]));
        this.separableBlurMaterials[i].uniforms["invSize"].value = new import_three6.Vector2(1 / resx, 1 / resy);
        resx = Math.round(resx / 2);
        resy = Math.round(resy / 2);
      }
      this.compositeMaterial = this.getCompositeMaterial(this.nMips);
      this.compositeMaterial.uniforms["blurTexture1"].value = this.renderTargetsVertical[0].texture;
      this.compositeMaterial.uniforms["blurTexture2"].value = this.renderTargetsVertical[1].texture;
      this.compositeMaterial.uniforms["blurTexture3"].value = this.renderTargetsVertical[2].texture;
      this.compositeMaterial.uniforms["blurTexture4"].value = this.renderTargetsVertical[3].texture;
      this.compositeMaterial.uniforms["blurTexture5"].value = this.renderTargetsVertical[4].texture;
      this.compositeMaterial.uniforms["bloomStrength"].value = strength;
      this.compositeMaterial.uniforms["bloomRadius"].value = 0.1;
      const bloomFactors = [1, 0.8, 0.6, 0.4, 0.2];
      this.compositeMaterial.uniforms["bloomFactors"].value = bloomFactors;
      this.bloomTintColors = [new import_three6.Vector3(1, 1, 1), new import_three6.Vector3(1, 1, 1), new import_three6.Vector3(1, 1, 1), new import_three6.Vector3(1, 1, 1), new import_three6.Vector3(1, 1, 1)];
      this.compositeMaterial.uniforms["bloomTintColors"].value = this.bloomTintColors;
      const copyShader = CopyShader;
      this.copyUniforms = import_three6.UniformsUtils.clone(copyShader.uniforms);
      this.blendMaterial = new import_three6.ShaderMaterial({
        uniforms: this.copyUniforms,
        vertexShader: copyShader.vertexShader,
        fragmentShader: copyShader.fragmentShader,
        blending: import_three6.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        transparent: true
      });
      this.enabled = true;
      this.needsSwap = false;
      this._oldClearColor = new import_three6.Color();
      this.oldClearAlpha = 1;
      this.basic = new import_three6.MeshBasicMaterial();
      this.fsQuad = new FullScreenQuad(null);
    }
    dispose() {
      for (let i = 0; i < this.renderTargetsHorizontal.length; i++) {
        this.renderTargetsHorizontal[i].dispose();
      }
      for (let i = 0; i < this.renderTargetsVertical.length; i++) {
        this.renderTargetsVertical[i].dispose();
      }
      this.renderTargetBright.dispose();
      for (let i = 0; i < this.separableBlurMaterials.length; i++) {
        this.separableBlurMaterials[i].dispose();
      }
      this.compositeMaterial.dispose();
      this.blendMaterial.dispose();
      this.basic.dispose();
      this.fsQuad.dispose();
    }
    setSize(width, height) {
      let resx = Math.round(width / 2);
      let resy = Math.round(height / 2);
      this.renderTargetBright.setSize(resx, resy);
      for (let i = 0; i < this.nMips; i++) {
        this.renderTargetsHorizontal[i].setSize(resx, resy);
        this.renderTargetsVertical[i].setSize(resx, resy);
        this.separableBlurMaterials[i].uniforms["invSize"].value = new import_three6.Vector2(1 / resx, 1 / resy);
        resx = Math.round(resx / 2);
        resy = Math.round(resy / 2);
      }
    }
    render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
      renderer.getClearColor(this._oldClearColor);
      this.oldClearAlpha = renderer.getClearAlpha();
      const oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      renderer.setClearColor(this.clearColor, 0);
      if (maskActive) renderer.state.buffers.stencil.setTest(false);
      if (this.renderToScreen) {
        this.fsQuad.material = this.basic;
        this.basic.map = readBuffer.texture;
        renderer.setRenderTarget(null);
        renderer.clear();
        this.fsQuad.render(renderer);
      }
      this.highPassUniforms["tDiffuse"].value = readBuffer.texture;
      this.highPassUniforms["luminosityThreshold"].value = this.threshold;
      this.fsQuad.material = this.materialHighPassFilter;
      renderer.setRenderTarget(this.renderTargetBright);
      renderer.clear();
      this.fsQuad.render(renderer);
      let inputRenderTarget = this.renderTargetBright;
      for (let i = 0; i < this.nMips; i++) {
        this.fsQuad.material = this.separableBlurMaterials[i];
        this.separableBlurMaterials[i].uniforms["colorTexture"].value = inputRenderTarget.texture;
        this.separableBlurMaterials[i].uniforms["direction"].value = _UnrealBloomPass.BlurDirectionX;
        renderer.setRenderTarget(this.renderTargetsHorizontal[i]);
        renderer.clear();
        this.fsQuad.render(renderer);
        this.separableBlurMaterials[i].uniforms["colorTexture"].value = this.renderTargetsHorizontal[i].texture;
        this.separableBlurMaterials[i].uniforms["direction"].value = _UnrealBloomPass.BlurDirectionY;
        renderer.setRenderTarget(this.renderTargetsVertical[i]);
        renderer.clear();
        this.fsQuad.render(renderer);
        inputRenderTarget = this.renderTargetsVertical[i];
      }
      this.fsQuad.material = this.compositeMaterial;
      this.compositeMaterial.uniforms["bloomStrength"].value = this.strength;
      this.compositeMaterial.uniforms["bloomRadius"].value = this.radius;
      this.compositeMaterial.uniforms["bloomTintColors"].value = this.bloomTintColors;
      renderer.setRenderTarget(this.renderTargetsHorizontal[0]);
      renderer.clear();
      this.fsQuad.render(renderer);
      this.fsQuad.material = this.blendMaterial;
      this.copyUniforms["tDiffuse"].value = this.renderTargetsHorizontal[0].texture;
      if (maskActive) renderer.state.buffers.stencil.setTest(true);
      if (this.renderToScreen) {
        renderer.setRenderTarget(null);
        this.fsQuad.render(renderer);
      } else {
        renderer.setRenderTarget(readBuffer);
        this.fsQuad.render(renderer);
      }
      renderer.setClearColor(this._oldClearColor, this.oldClearAlpha);
      renderer.autoClear = oldAutoClear;
    }
    getSeperableBlurMaterial(kernelRadius) {
      const coefficients = [];
      for (let i = 0; i < kernelRadius; i++) {
        coefficients.push(0.39894 * Math.exp(-0.5 * i * i / (kernelRadius * kernelRadius)) / kernelRadius);
      }
      return new import_three6.ShaderMaterial({
        defines: {
          "KERNEL_RADIUS": kernelRadius
        },
        uniforms: {
          "colorTexture": { value: null },
          "invSize": { value: new import_three6.Vector2(0.5, 0.5) },
          // inverse texture size
          "direction": { value: new import_three6.Vector2(0.5, 0.5) },
          "gaussianCoefficients": { value: coefficients }
          // precomputed Gaussian coefficients
        },
        vertexShader: `varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
        fragmentShader: `#include <common>
				varying vec2 vUv;
				uniform sampler2D colorTexture;
				uniform vec2 invSize;
				uniform vec2 direction;
				uniform float gaussianCoefficients[KERNEL_RADIUS];

				void main() {
					float weightSum = gaussianCoefficients[0];
					vec3 diffuseSum = texture2D( colorTexture, vUv ).rgb * weightSum;
					for( int i = 1; i < KERNEL_RADIUS; i ++ ) {
						float x = float(i);
						float w = gaussianCoefficients[i];
						vec2 uvOffset = direction * invSize * x;
						vec3 sample1 = texture2D( colorTexture, vUv + uvOffset ).rgb;
						vec3 sample2 = texture2D( colorTexture, vUv - uvOffset ).rgb;
						diffuseSum += (sample1 + sample2) * w;
						weightSum += 2.0 * w;
					}
					gl_FragColor = vec4(diffuseSum/weightSum, 1.0);
				}`
      });
    }
    getCompositeMaterial(nMips) {
      return new import_three6.ShaderMaterial({
        defines: {
          "NUM_MIPS": nMips
        },
        uniforms: {
          "blurTexture1": { value: null },
          "blurTexture2": { value: null },
          "blurTexture3": { value: null },
          "blurTexture4": { value: null },
          "blurTexture5": { value: null },
          "bloomStrength": { value: 1 },
          "bloomFactors": { value: null },
          "bloomTintColors": { value: null },
          "bloomRadius": { value: 0 }
        },
        vertexShader: `varying vec2 vUv;
				void main() {
					vUv = uv;
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
				}`,
        fragmentShader: `varying vec2 vUv;
				uniform sampler2D blurTexture1;
				uniform sampler2D blurTexture2;
				uniform sampler2D blurTexture3;
				uniform sampler2D blurTexture4;
				uniform sampler2D blurTexture5;
				uniform float bloomStrength;
				uniform float bloomRadius;
				uniform float bloomFactors[NUM_MIPS];
				uniform vec3 bloomTintColors[NUM_MIPS];

				float lerpBloomFactor(const in float factor) {
					float mirrorFactor = 1.2 - factor;
					return mix(factor, mirrorFactor, bloomRadius);
				}

				void main() {
					gl_FragColor = bloomStrength * ( lerpBloomFactor(bloomFactors[0]) * vec4(bloomTintColors[0], 1.0) * texture2D(blurTexture1, vUv) +
						lerpBloomFactor(bloomFactors[1]) * vec4(bloomTintColors[1], 1.0) * texture2D(blurTexture2, vUv) +
						lerpBloomFactor(bloomFactors[2]) * vec4(bloomTintColors[2], 1.0) * texture2D(blurTexture3, vUv) +
						lerpBloomFactor(bloomFactors[3]) * vec4(bloomTintColors[3], 1.0) * texture2D(blurTexture4, vUv) +
						lerpBloomFactor(bloomFactors[4]) * vec4(bloomTintColors[4], 1.0) * texture2D(blurTexture5, vUv) );
				}`
      });
    }
  };
  UnrealBloomPass.BlurDirectionX = new import_three6.Vector2(1, 0);
  UnrealBloomPass.BlurDirectionY = new import_three6.Vector2(0, 1);

  // three/examples/jsm/postprocessing/OutputPass.js
  var import_three7 = __toESM(require_three(), 1);

  // three/examples/jsm/shaders/OutputShader.js
  var OutputShader = {
    name: "OutputShader",
    uniforms: {
      "tDiffuse": { value: null },
      "toneMappingExposure": { value: 1 }
    },
    vertexShader: (
      /* glsl */
      `
		precision highp float;

		uniform mat4 modelViewMatrix;
		uniform mat4 projectionMatrix;

		attribute vec3 position;
		attribute vec2 uv;

		varying vec2 vUv;

		void main() {

			vUv = uv;
			gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

		}`
    ),
    fragmentShader: (
      /* glsl */
      `
	
		precision highp float;

		uniform sampler2D tDiffuse;

		#include <tonemapping_pars_fragment>
		#include <colorspace_pars_fragment>

		varying vec2 vUv;

		void main() {

			gl_FragColor = texture2D( tDiffuse, vUv );

			// tone mapping

			#ifdef LINEAR_TONE_MAPPING

				gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );

			#elif defined( REINHARD_TONE_MAPPING )

				gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );

			#elif defined( CINEON_TONE_MAPPING )

				gl_FragColor.rgb = OptimizedCineonToneMapping( gl_FragColor.rgb );

			#elif defined( ACES_FILMIC_TONE_MAPPING )

				gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );

			#endif

			// color space

			#ifdef SRGB_TRANSFER

				gl_FragColor = sRGBTransferOETF( gl_FragColor );

			#endif

		}`
    )
  };

  // three/examples/jsm/postprocessing/OutputPass.js
  var OutputPass = class extends Pass {
    constructor() {
      super();
      const shader = OutputShader;
      this.uniforms = import_three7.UniformsUtils.clone(shader.uniforms);
      this.material = new import_three7.RawShaderMaterial({
        name: shader.name,
        uniforms: this.uniforms,
        vertexShader: shader.vertexShader,
        fragmentShader: shader.fragmentShader
      });
      this.fsQuad = new FullScreenQuad(this.material);
      this._outputColorSpace = null;
      this._toneMapping = null;
    }
    render(renderer, writeBuffer, readBuffer) {
      this.uniforms["tDiffuse"].value = readBuffer.texture;
      this.uniforms["toneMappingExposure"].value = renderer.toneMappingExposure;
      if (this._outputColorSpace !== renderer.outputColorSpace || this._toneMapping !== renderer.toneMapping) {
        this._outputColorSpace = renderer.outputColorSpace;
        this._toneMapping = renderer.toneMapping;
        this.material.defines = {};
        if (import_three7.ColorManagement.getTransfer(this._outputColorSpace) === import_three7.SRGBTransfer) this.material.defines.SRGB_TRANSFER = "";
        if (this._toneMapping === import_three7.LinearToneMapping) this.material.defines.LINEAR_TONE_MAPPING = "";
        else if (this._toneMapping === import_three7.ReinhardToneMapping) this.material.defines.REINHARD_TONE_MAPPING = "";
        else if (this._toneMapping === import_three7.CineonToneMapping) this.material.defines.CINEON_TONE_MAPPING = "";
        else if (this._toneMapping === import_three7.ACESFilmicToneMapping) this.material.defines.ACES_FILMIC_TONE_MAPPING = "";
        this.material.needsUpdate = true;
      }
      if (this.renderToScreen === true) {
        renderer.setRenderTarget(null);
        this.fsQuad.render(renderer);
      } else {
        renderer.setRenderTarget(writeBuffer);
        if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
        this.fsQuad.render(renderer);
      }
    }
    dispose() {
      this.material.dispose();
      this.fsQuad.dispose();
    }
  };

  globalThis.RainPost = { EffectComposer, RenderPass, UnrealBloomPass, OutputPass };
})();
