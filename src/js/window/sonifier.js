const Tone = require("tone")
const util = require('../utils/index')

/*
    x
    y

    pressure
    tilt
    angle

    eraser
    pointerType

    sW
    sH

    timestamp
*/
const loop = require('raf-loop')

const instrument = (() => {
  const pathToSample = "./snd/drawing-loop.wav"

  let sampler = new Tone.Player(pathToSample)
    .set('loop', true)
    .set('retrigger', true)
    .set('volume', -20)
    .stop()

  let eq = new Tone.EQ3()
    .set({
      low: -4,
      lowFrequency: 2200
    })

  let env = new Tone.AmplitudeEnvelope({
  	"attack": 0.025,
  	"decay": 0.0,
  	"sustain": 1.0,
  	"release": 0.3
  })

  let gain = new Tone.Gain({ gain: 0 })

  sampler.chain(eq, env, gain, Tone.Master)

  const start = () => {
    if (sampler.buffer.loaded) {
      const offset = Math.random() * sampler.buffer.duration

      // TODO ping-pong loop
      sampler.reverse = false

      sampler.start(0, offset)
    }

    env.triggerAttack()
  }
  
  const stop = () => env.triggerRelease()

  return {
    start,
    stop,

    hpFreq: eq.lowFrequency,
    gain: gain.gain
  }
})()

const distance = (x1, y1, x2, y2) =>
  Math.hypot(x2 - x1, y2 - y1)

const createModel = () => ({
  avgSpeed: 0,

  accel: 0,

  totalDistance: 0,
  totalTime: 0,

  damping: 0.2,

  isMoving: false,
  isAccel: false
})

let engine
let model
let events
let prev
let curr

const init = () => {
  engine = loop(step)

  events = []
  model = createModel()

  engine.start()
}

const start = () => {
  events = []
  model = createModel()
  prev = null
  curr = null
  instrument.start()
  instrument.hpFreq.value = 200
  instrument.gain.value = 0
}

const stop = () => {
  instrument.stop()
}

const trigger = curr => {
  let speed = prev ? distance(prev.x, prev.y, curr.x, curr.y) : 0

  model.isMoving = speed > 0 ? true : false
  model.accel += speed

  instrument.hpFreq.rampTo(200 + (model.accel * 40), 0.01)

  prev = curr
}

const step = dt => {
  let frameSize = 1/60*1000 / dt



  let wasAccel = model.isAccel
  model.isAccel = (model.accel > 0.1) ? true : false
  let changedAccel = model.isAccel != model.wasAccel
  if (changedAccel) {
    if (model.isAccel) {
      const v = util.clamp(model.accel / 10, 0.25, 1)
      instrument.gain.cancelScheduledValues()
      instrument.gain.rampTo(
        v,
        0.05)
    } else {
      instrument.gain.cancelScheduledValues()
      instrument.gain.rampTo(0, 0.1)
    }
  }

  model.accel *= frameSize * model.damping
  if (model.accel < 0.0001) model.accel = 0

  model.totalTime += dt
  model.avgSpeed = model.totalDistance / model.totalTime || 0
}

module.exports = {
  init,
  start,
  stop,
  trigger
}