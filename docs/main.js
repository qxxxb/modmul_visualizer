const globals = {
  canvas: undefined,
  gl: undefined,
  programInfo: undefined,
  buffers: undefined,
  texture: undefined,
  totalTime: 0.0,
  modulus: 17.0,
  modulusInput: undefined,
  playButton: undefined,
  playing: false,
  modulusIncrementInterval: undefined,
  mode: 'multiplication'
}

// Borrowed code from https://github.com/d3/d3-scale-chromatic
// to implement viridis colorscheme.
// viridis(0) -> purple
// viridis(1) -> yellow
// Values in-between are interpolated

function colors (specifier) {
  const n = (specifier.length / 6) | 0
  const colors = new Array(n)
  let i = 0
  while (i < n) colors[i] = '#' + specifier.slice(i * 6, ++i * 6)
  return colors
}

function ramp (range) {
  const n = range.length
  return function (t) {
    return range[Math.max(0, Math.min(n - 1, Math.floor(t * n)))]
  }
}

function hexToRgb (hex) {
  const bigint = parseInt(hex.slice(1), 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return [r, g, b]
}

const viridis = ramp(
  colors(
    '44015444025645045745055946075a46085c460a5d460b5e470d60470e6147106347116447136548146748166848176948186a481a6c481b6d481c6e481d6f481f70482071482173482374482475482576482677482878482979472a7a472c7a472d7b472e7c472f7d46307e46327e46337f463480453581453781453882443983443a83443b84433d84433e85423f854240864241864142874144874045884046883f47883f48893e49893e4a893e4c8a3d4d8a3d4e8a3c4f8a3c508b3b518b3b528b3a538b3a548c39558c39568c38588c38598c375a8c375b8d365c8d365d8d355e8d355f8d34608d34618d33628d33638d32648e32658e31668e31678e31688e30698e306a8e2f6b8e2f6c8e2e6d8e2e6e8e2e6f8e2d708e2d718e2c718e2c728e2c738e2b748e2b758e2a768e2a778e2a788e29798e297a8e297b8e287c8e287d8e277e8e277f8e27808e26818e26828e26828e25838e25848e25858e24868e24878e23888e23898e238a8d228b8d228c8d228d8d218e8d218f8d21908d21918c20928c20928c20938c1f948c1f958b1f968b1f978b1f988b1f998a1f9a8a1e9b8a1e9c891e9d891f9e891f9f881fa0881fa1881fa1871fa28720a38620a48621a58521a68522a78522a88423a98324aa8325ab8225ac8226ad8127ad8128ae8029af7f2ab07f2cb17e2db27d2eb37c2fb47c31b57b32b67a34b67935b77937b87838b9773aba763bbb753dbc743fbc7340bd7242be7144bf7046c06f48c16e4ac16d4cc26c4ec36b50c46a52c56954c56856c66758c7655ac8645cc8635ec96260ca6063cb5f65cb5e67cc5c69cd5b6ccd5a6ece5870cf5773d05675d05477d1537ad1517cd2507fd34e81d34d84d44b86d54989d5488bd6468ed64590d74393d74195d84098d83e9bd93c9dd93ba0da39a2da37a5db36a8db34aadc32addc30b0dd2fb2dd2db5de2bb8de29bade28bddf26c0df25c2df23c5e021c8e020cae11fcde11dd0e11cd2e21bd5e21ad8e219dae319dde318dfe318e2e418e5e419e7e419eae51aece51befe51cf1e51df4e61ef6e620f8e621fbe723fde725'
  )
)

init()

function init () {
  const canvas = document.getElementById('glcanvas')
  const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true })

  if (!gl) {
    alert(
      'Unable to initialize WebGL. Your browser or machine may not support it.'
    )
    return
  }

  // Vertex shader program

  const vsSource = `attribute highp vec2 aVertexPosition;

varying vec2 vPos;

void main() {
  gl_Position = vec4(aVertexPosition, 0.0, 1.0);
}
`

  // Fragment shader program

  const fsSource = `precision highp float;

varying vec2 vPos;

uniform sampler2D uSampler;
uniform vec2 uResolution;

void main(void) {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  uv.y = 1.0 - uv.y; // Flip so origin is top left
  vec4 diffuse = texture2D(uSampler, uv);
  gl_FragColor = diffuse;
}
`

  const shaderProgram = initShaderProgram(gl, vsSource, fsSource)

  // Collect all the info needed to use the shader program.
  // Look up which attributes and uniform locations from our shader program.
  const programInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition')
    },
    uniformLocations: {
      uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
      uResolution: gl.getUniformLocation(shaderProgram, 'uResolution')
    }
  }

  // Here's where we call the routine that builds all the
  // objects we'll be drawing.
  const buffers = initBuffers(gl)

  globals.canvas = canvas
  globals.gl = gl
  globals.shaderProgram = shaderProgram
  globals.programInfo = programInfo
  globals.buffers = buffers

  initModulusInput()
  initPlayButton()
  initModeDropdown()

  globals.texture = createTexture()
  startDrawing()
}

function initModulusInput () {
  globals.modulusInput = document.getElementById('modulus')
  globals.modulusInput.value = globals.modulus
  globals.modulusInput.addEventListener('change', (event) => {
    globals.modulus = parseInt(event.target.value)
    globals.texture = createTexture()
  })
}

function initPlayButton () {
  globals.playButton = document.getElementById('play')

  globals.playButton.addEventListener('click', (event) => {
    if (globals.playing) {
      clearInterval(globals.modulusIncrementInterval)
      globals.playing = false
      globals.playButton.textContent = 'Play'
    } else {
      globals.modulusIncrementInterval = setInterval(() => {
        globals.modulus++
        globals.texture = createTexture()
        globals.modulusInput.value = globals.modulus
      }, 100)

      globals.playButton.textContent = 'Stop'
      globals.playing = true
    }
  })
}

function initModeDropdown () {
  const modeDropdown = document.getElementById('mode')

  modeDropdown.addEventListener('click', (event) => {
    globals.mode = event.target.value
    globals.texture = createTexture()
  })
}

function startDrawing () {
  let startTime
  globals.totalTime = 0.0

  function render (now) {
    if (startTime === undefined) startTime = now
    globals.totalTime = now - startTime

    drawScene(
      globals.gl,
      globals.programInfo,
      globals.buffers,
      globals.texture
    )

    requestAnimationFrame(render)
  }

  requestAnimationFrame(render)
}

function initBuffers (gl) {
  // Create a buffer for a square.
  const positionBuffer = gl.createBuffer()

  // Select the positionBuffer as the one to apply buffer
  // operations to from here out.
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

  // Now create an array of positions for the square.
  const positions = makeRectangle(gl, -1.0, -1.0, 2.0, 2.0)

  // Now pass the list of positions into WebGL to build the
  // shape. We do this by creating a Float32Array from the
  // JavaScript array, then use it to fill the current buffer.
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

  return { position: positionBuffer }
}

function powerMod (a, p, n) {
  let ans = 1
  while (p > 0) {
    if (p % 2 === 1) ans = (ans * a) % n
    p = p >> 1
    a = (a * a) % n
  }
  return ans
}

function multiplicativeOrder (a, n) {
  // TODO: Extremely SLOW
  let x = a
  let i = 1
  while (true) {
    if (x === 1) return i
    x = (x * a) % n
    i += 1
  }
}

function createTexture () {
  const gl = globals.gl
  const modulus = globals.modulus

  const n = modulus - 1
  const data = new Uint8Array(n * n * 4)

  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      const a = x + 1
      const b = y + 1

      let v = 0
      switch (globals.mode) {
        case 'multiplication':
          v = (a * b) % modulus
          break
        case 'addition':
          v = (a + b) % modulus
          break
        case 'exponentiation':
          v = powerMod(a, b, modulus)
          break
        case 'order':
          v = multiplicativeOrder((a * b) % modulus, modulus)
          break
        case 'generators':
          v =
            multiplicativeOrder((a * b) % modulus, modulus) === n ? modulus : 0
          break
      }

      const color = hexToRgb(viridis(v / modulus))

      data[(y * n + x) * 4 + 0] = color[0]
      data[(y * n + x) * 4 + 1] = color[1]
      data[(y * n + x) * 4 + 2] = color[2]
      data[(y * n + x) * 4 + 3] = 255
    }
  }

  const texture = gl.createTexture()

  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.texImage2D(
    gl.TEXTURE_2D,
    0, // level
    gl.RGBA, // internalFormat
    n, // width
    n, // height
    0, // border
    gl.RGBA, // srcFormat
    gl.UNSIGNED_BYTE, // srcType
    data
  )

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)

  return texture
}

function drawScene (gl, programInfo, buffers, texture) {
  gl.clearColor(0.0, 0.0, 0.0, 1.0)
  gl.clear(gl.COLOR_BUFFER_BIT)

  // Tell WebGL how to pull out the positions from the position
  // buffer into the vertexPosition attribute
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position)
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    2, // numComponents
    gl.FLOAT, // type
    false, // normalize
    0, // stride
    0 // offset
  )
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition)

  // Tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program)

  // Set the shader uniforms

  // Tell WebGL we want to affect texture unit 0.
  // Bind the texture to texture unit 0.
  // Tell the shader we bound the texture to texture unit 0.
  gl.activeTexture(gl.TEXTURE0)
  gl.bindTexture(gl.TEXTURE_2D, texture)
  gl.uniform1i(programInfo.uniformLocations.uSampler, 0)

  // Resolution
  gl.uniform2f(
    programInfo.uniformLocations.uResolution,
    gl.canvas.clientWidth,
    gl.canvas.clientHeight
  )

  {
    const vertexCount = 6
    gl.drawArrays(gl.TRIANGLES, 0, vertexCount)
  }
}

function initShaderProgram (gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)

  // Create the shader program
  const shaderProgram = gl.createProgram()
  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.linkProgram(shaderProgram)

  // If creating the shader program failed, alert
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      'Unable to initialize the shader program: ' +
        gl.getProgramInfoLog(shaderProgram)
    )
    return null
  }

  return shaderProgram
}

function loadShader (gl, type, source) {
  // Creates a shader of the given type, uploads the source, and compiles it.

  const shader = gl.createShader(type)

  // Send the source to the shader object
  gl.shaderSource(shader, source)

  // Compile the shader program
  gl.compileShader(shader)

  // See if it compiled successfully
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      'An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader)
    )
    gl.deleteShader(shader)
    return null
  }

  return shader
}

function makeRectangle (gl, x, y, width, height) {
  const x1 = x
  const x2 = x + width
  const y1 = y
  const y2 = y + height
  return [x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]
}
