/* Small additive bloom for Three r160. Half-or-quarter res, no extra library.
   Falls back to a plain render if a render target fails. */
(function(){
  const VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  function mat(frag, uniforms){
    return new THREE.ShaderMaterial({
      uniforms, vertexShader: VERT, fragmentShader: frag,
      depthTest: false, depthWrite: false, toneMapped: false
    });
  }
  window.LabBloom = function(renderer, scene, camera, opt){
    opt = opt || {};
    const div = opt.div || (matchMedia('(pointer:coarse)').matches ? 4 : 2);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
    const qScene = new THREE.Scene(); qScene.add(quad);
    const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    qCam.position.z = 1;
    const brightMat = mat(
      'uniform sampler2D tDiffuse; uniform float threshold; varying vec2 vUv;' +
      'void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = max(c.r, max(c.g, c.b));' +
      'float k = smoothstep(threshold, threshold + 0.4, l); gl_FragColor = vec4(c.rgb * k, 1.0); }',
      { tDiffuse: { value: null }, threshold: { value: opt.threshold == null ? 0.58 : opt.threshold } }
    );
    const blurMat = mat(
      'uniform sampler2D tDiffuse; uniform vec2 dir; varying vec2 vUv;' +
      'void main(){ vec4 c = texture2D(tDiffuse, vUv) * 0.227027;' +
      'c += texture2D(tDiffuse, vUv + dir * 1.384615) * 0.316216;' +
      'c += texture2D(tDiffuse, vUv - dir * 1.384615) * 0.316216;' +
      'c += texture2D(tDiffuse, vUv + dir * 3.230769) * 0.070270;' +
      'c += texture2D(tDiffuse, vUv - dir * 3.230769) * 0.070270;' +
      'gl_FragColor = c; }',
      { tDiffuse: { value: null }, dir: { value: new THREE.Vector2() } }
    );
    const outMat = mat(
      'uniform sampler2D tScene; uniform sampler2D tBloom; uniform float strength; varying vec2 vUv;' +
      'void main(){ vec4 s = texture2D(tScene, vUv); vec4 b = texture2D(tBloom, vUv);' +
      'gl_FragColor = vec4(s.rgb + b.rgb * strength, s.a); }',
      { tScene: { value: null }, tBloom: { value: null }, strength: { value: opt.strength == null ? 0.85 : opt.strength } }
    );
    let sceneRT, brightRT, blurRT, failed = false;
    function alloc(){
      const cw = Math.max(2, renderer.domElement.width || 2);
      const ch = Math.max(2, renderer.domElement.height || 2);
      const bw = Math.max(2, Math.floor(cw / div)), bh = Math.max(2, Math.floor(ch / div));
      if (sceneRT) { sceneRT.dispose(); brightRT.dispose(); blurRT.dispose(); }
      const linear = THREE.LinearSRGBColorSpace;
      sceneRT = new THREE.WebGLRenderTarget(cw, ch, { depthBuffer: true });
      brightRT = new THREE.WebGLRenderTarget(bw, bh, { depthBuffer: false });
      blurRT = new THREE.WebGLRenderTarget(bw, bh, { depthBuffer: false });
      if (linear) [sceneRT, brightRT, blurRT].forEach(t => { t.texture.colorSpace = linear; });
    }
    function pass(material, target){
      quad.material = material;
      renderer.setRenderTarget(target);
      renderer.render(qScene, qCam);
    }
    alloc();
    return {
      resize: alloc,
      render(){
        if (failed) { renderer.setRenderTarget(null); renderer.render(scene, camera); return; }
        try {
          renderer.setRenderTarget(sceneRT);
          renderer.render(scene, camera);
          brightMat.uniforms.tDiffuse.value = sceneRT.texture;
          pass(brightMat, brightRT);
          blurMat.uniforms.tDiffuse.value = brightRT.texture;
          blurMat.uniforms.dir.value.set(1.15 / brightRT.width, 0);
          pass(blurMat, blurRT);
          blurMat.uniforms.tDiffuse.value = blurRT.texture;
          blurMat.uniforms.dir.value.set(0, 1.15 / brightRT.height);
          pass(blurMat, brightRT);
          outMat.uniforms.tScene.value = sceneRT.texture;
          outMat.uniforms.tBloom.value = brightRT.texture;
          renderer.setRenderTarget(null);
          pass(outMat, null);
        } catch (err) {
          failed = true;
          renderer.setRenderTarget(null);
          renderer.render(scene, camera);
        }
      }
    };
  };
})();
