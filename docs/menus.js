'use strict'

var dat = require('./lib/dat-gui.min.js')
var defs = require('../src/progDefs')


module.exports = Menus



function Menus() {
    var self = this
    var state = {}
    var gui

    this.init = function (container, width, numSignals) {
        gui = new dat.GUI({
            autoPlace: false,
            hideable: false,
            width: width,
        })
        window.gui = gui

        buildMenuOptions(gui, state, numSignals)

        container.appendChild(gui.domElement)
    }

    this.showProgram = function (prog) {
        setFromProgram(state, prog, gui)
    }

    // events etc
    onChange = function (ev) {
        setProgramFromMenus(currProg, state)
        self.onChange(currProg)
    }

    // set by client code
    this.onChange = function () { }


}

var onChange
var currProg = { freq: {}, gain: {} }







/*  
 *  
 *          PROGRAM WRANGLING
 * 
*/


var defSig = new defs.Signal('', '', new defs.Sweep(), new defs.Envelope())

var sweepProps = ['t', 'f', 'p', 'q', 'k', 'j', 'jt']
var envProps = ['v', 'a', 'h', 'd', 's', 'r', 'k']


function setFromProgram(state, prog, gui) {
    currProg = prog
    var sweepTgt = state.sweep.forSignal
    var envTgt = state.envelope.forSignal
    state.signals.forEach(function (obj, i) {
        var signal = prog[i]
        var f = gui.__folders['Signal ' + i]
        obj.enabled = !!signal
        if (signal) {
            obj.type = signal.type || 'sine'
            obj.target = signal.target || ''
            if (f.closed) f.open()
        } else {
            if (!f.closed) f.close()
        }
    })
    drawMenuTargets(state, gui)
}

function drawMenuTargets(state, gui) {
    setSweepGUI(state, currProg)
    setEnvelopeGUI(state, currProg)
    updateGUI(gui)
}


function updateGUI(obj) {
    if (obj.__controllers) obj.__controllers.forEach(c => c.updateDisplay())
    if (obj.__folders) for (var s in obj.__folders) updateGUI(obj.__folders[s])
}


function setSweepGUI(state, prog) {
    var n = state.sweep.forSignal
    var signal = prog[n]
    var obj = signal[state.sweep.forProp]
    var def = defSig[state.sweep.forProp]
    if (!obj) return
    sweepProps.forEach(p => {
        var val = obj[p]
        state.sweep[p] = (val === undefined) ? def[p] : val
    })
}


function setEnvelopeGUI(state, prog) {
    var n = state.envelope.forSignal
    var signal = prog[n]
    var obj = signal[state.envelope.forProp]
    var def = defSig[state.envelope.forProp]
    if (!obj) return
    envProps.forEach(p => {
        var val = obj[p]
        state.envelope[p] = (val === undefined) ? def[p] : val
    })
}





// update program object from current UI state

function setProgramFromMenus(currProg, state) {
    // conform number and enabled-ness of signals
    state.signals.forEach((obj, i) => {
        if (obj.enabled && !currProg[i]) currProg[i] = new defs.Signal()
        if (currProg[i] && !obj.enabled) currProg[i].type = 'none'
    })
    // set type/target of all signals
    state.signals.forEach((obj, i) => {
        var signal = currProg[i]
        if (obj.enabled) {
            signal.type = obj.type || ''
            signal.target = obj.target || ''
        }
    })
    var sweepObj = currProg[state.sweep.forSignal][state.sweep.forProp]
    if (sweepObj) {
        sweepProps.forEach(p => sweepObj[p] = state.sweep[p])
    }
    var envObj = currProg[state.envelope.forSignal][state.envelope.forProp]
    if (envObj) {
        envProps.forEach(p => envObj[p] = state.envelope[p])
    }
}


// function uiStateToProgram(state) {
//     var prog = []
//     return prog
// }


// function formatProgram(prog) {
//     var lines = []
//     prog.forEach(sig => {
//         var line1 = '  { ' + sigProps.map(p => {
//             return sig[p] ? formatProp(sig, p) : ''
//         }).filter(p => p).join(', ')
//         if (line1.length > 5) line1 += ', '
//         var line2 = '    freq: { ' + sweepProps.map(p => {
//             return formatProp(sig.freq, p)
//         }).filter(p => p).join(', ') + ' }, '
//         var line3 = '    gain: { ' + envProps.map(p => {
//             return formatProp(sig.gain, p)
//         }).filter(p => p).join(', ') + ' }  },'
//         lines.push(line1, line2, line3)
//     })
//     lines.push(']')
//     lines[0] = '[' + lines[0].substr(1)
//     return lines.join('\n')
// }

// function formatProp(obj, p) {
//     if (isNaN(obj[p]) && !obj[p]) return ''
//     if (typeof obj[p] === 'number') return `${p}: ${Math.round(1000 * obj[p]) / 1000}`
//     return `${p}: '${obj[p]}'`
// }








/*
 *  
 *          GUI BUILDING
 * 
*/

function buildMenuOptions(gui, state, numSignals) {
    state.signals = []
    for (var i = 0; i < numSignals; i++) {
        state.signals[i] = createSignalGUI(gui, i)
    }
    addSweepFolder(gui, state, numSignals)
    addEnvelopeFolder(gui, state, numSignals)
}


function createSignalGUI(gui, num) {
    var f = gui.addFolder('Signal ' + num)
    if (num === 0) f.open()
    var obj = {
        enabled: (num === 0),
        type: defSig.type,
        target: defSig.target,
    }
    f.add(obj, 'enabled').onChange(onChange)
    f.add(obj, 'type').onChange(onChange)
    f.add(obj, 'target').name('target (0.freq..)').onChange(onChange)
    return obj
}


function addProp(obj, f, prop, defObj, lo, hi, step, disp) {
    obj[prop] = defObj[prop]
    var res = f.add(obj, prop, lo, hi)
    if (step) res = res.step(step)
    res.name(prop + ' - ' + disp)
    res.onChange(onChange)
}



function addSweepFolder(gui, state, numSignals) {
    var f = gui.addFolder('Sweep')
    f.open()
    var obj = {
        forSignal: 0,
        forProp: 'freq',
    }
    var handle = function () { drawMenuTargets(state, gui) }
    f.add(obj, 'forSignal', 0, numSignals - 1).step(1).name('For signal').onChange(handle)
    f.add(obj, 'forProp', ['freq', 'gain']).name('For prop').onChange(handle)

    addProp(obj, f, 't', defSig.freq, 0, 13, 0.1, 'mult')
    addProp(obj, f, 'f', defSig.freq, -10, 200, 0.1, 'add')
    addProp(obj, f, 'p', defSig.freq, 0, 2, 0.01, 'bend')
    addProp(obj, f, 'q', defSig.freq, 0, 2, 0.01, 'bend const')
    addProp(obj, f, 'k', defSig.freq, -2, 2, 0.01, 'vol keying')
    addProp(obj, f, 'j', defSig.freq, 0, 0, 0, 'jumps')
    addProp(obj, f, 'jt', defSig.freq, 0, 0, 0, 'jump times')
    state.sweep = obj
}


function addEnvelopeFolder(gui, state, numSignals) {
    var f = gui.addFolder('Envelope')
    f.open()
    var obj = {
        forSignal: 0,
        forProp: 'gain',
    }
    var handle = function () { drawMenuTargets(state, gui) }
    f.add(obj, 'forSignal', 0, numSignals - 1).step(1).name('For signal').onChange(handle)
    f.add(obj, 'forProp', ['freq', 'gain']).name('For prop').onChange(handle)

    addProp(obj, f, 'v', defSig.gain, 0, 10, 0.1, 'peak')
    addProp(obj, f, 'a', defSig.gain, 0, 2, 0.001, 'attack time')
    addProp(obj, f, 'h', defSig.gain, 0, 2, 0.001, 'hold time')
    addProp(obj, f, 'd', defSig.gain, 0, 10, 0.01, 'decay const')
    addProp(obj, f, 's', defSig.gain, 0, 10, 0.1, 'sus level')
    addProp(obj, f, 'r', defSig.gain, 0, 10, 0.01, 'release const')
    addProp(obj, f, 'k', defSig.gain, -2, 2, 0.01, 'vol keying')
    state.envelope = obj
}



