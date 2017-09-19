'use strict'

var defs = require('../progDefs')

module.exports = Params


/*
* 
*      general handler to apply a program object to an AudioParam
* 
*/


function Params() {

    var defSweep = new defs.Sweep()
    var defEnvelope = new defs.Envelope()

    var tmpSweep = new defs.Sweep()
    var tmpEnvelope = new defs.Envelope()

    var tempProg = {
        t: +0,
        f: +0,
    }


    this.apply = function (note, param, time, baseVal, program, inputFreq, isPBR) {

        // playbackRate params need a baked-in multiplier of 1/440
        var PBRmult = (isPBR) ? 1 / 440 : 1

        // null case of number being passed in
        if (typeof program === 'number') {
            tempProg.f = +program
            program = tempProg
        }

        // apply input key tracking before subsequent param programs
        if (program.k) {
            baseVal *= Math.pow(inputFreq / 261.625, program.k)
            // equivalent to: base *= Math.pow(2, (midiNote - 60) / 12 * k)
        }

        // apply sweep or envelope - sweep always has one of [t, f, p, j] nonzero
        if (program.t || program.f || program.p || program.j) {
            conformProg(tmpSweep, program, defSweep)
            return applyParamSweep(param, time, baseVal, tmpSweep, PBRmult)
        } else {
            conformProg(tmpEnvelope, program, defEnvelope)
            return applyParamEnvelope(note, param, time, baseVal, tmpEnvelope, PBRmult)
        }
    }


    // applies default values and then overwrites with inputs
    function conformProg(prog, src, defs) {
        for (var s in defs) prog[s] = defs[s]
        for (var s2 in src) prog[s2] = src[s2]
    }



    // apply a sweep program
    function applyParamSweep(param, time, value, prog, valueMult) {
        value = (value * prog.t + prog.f) * valueMult
        param.value = value

        var bend = (prog.p !== 1)
        var target = value * prog.p
        if (bend) param.setTargetAtTime(target, time, prog.q)

        // console.log('   param sweep:', value, bend ? ' --> ' + target : '')

        if (prog.j && prog.jt) {
            var js = prog.j.split(',').map(s => parseFloat(s))
            var jts = prog.jt.split(',').map(s => parseFloat(s))
            var v = value
            var t = 0
            for (var i = 0; i < js.length; i++) {
                var j = js[i]
                var jt = jts[i]
                if (j && jt) {
                    if (bend) {
                        v = j * evalTargetCurve(v, target, jt)
                        t += jt
                        param.setValueAtTime(v, time + t)
                        param.setTargetAtTime(target, time + t, prog.q)
                    } else {
                        v *= j
                        t += jt
                        param.setValueAtTime(v, time + t)
                    }
                }
            }
        }
        return value / valueMult
    }

    // evaluate value of param during a setTarget curve
    function evalTargetCurve(v0, vTarget, dt) {
        return vTarget + (v0 - vTarget) * Math.exp(-dt)
    }


    // apply an envelope program
    function applyParamEnvelope(note, param, time, peak, prog, valueMult) {
        param.value = 0
        peak = peak * prog.v * valueMult
        if (prog.a > 0) {
            param.setValueAtTime(0, time)
            param.linearRampToValueAtTime(peak, time + prog.a)
        } else {
            param.setValueAtTime(peak, time)
        }
        if (prog.s !== 1) {
            var decayTime = time + prog.a + prog.h
            param.setTargetAtTime(peak * prog.s, decayTime, prog.d)
        }
        // store values in the note object so that stuff can be done at release time
        note.envParams.push(param)
        note.envAttacks.push(prog.a || 0)
        note.envPeaks.push(peak)
        note.envReleases.push(prog.r || 0)

        // console.log('   param env:  0 -> ', peak, ' -> ' , peak * prog.s, ' -> 0')
        
        return peak / valueMult
    }





}


