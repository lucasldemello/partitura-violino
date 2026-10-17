"""Download Iowa arco/mf chromatic recordings and extract verified note segments."""
import argparse, json, pathlib, subprocess, tempfile, urllib.request, time
import numpy as np
import librosa
BASE = 'https://theremin.music.uiowa.edu/sound%20files/MIS/Strings/violin2012/'
SOURCES = [
 ('G','G3B3',0,[55,57,59]), ('G','C4B5',0,[60,62]),
 ('D','D4B4',1,[62,64,66,67,69]),
 ('A','A4B4',2,[69,71]), ('A','C5B5',2,[73,74,76]),
 ('E','E5B5',3,[76,78,80,81,83]),
]
OFFSETS=[0,2,4,5,7]; BASES=[55,62,69,76]
def best_segment(y,sr,midi):
    hop=256
    f=librosa.yin(y,fmin=150,fmax=1100,sr=sr,frame_length=2048,hop_length=hop)
    pitch=librosa.hz_to_midi(f)
    rms=librosa.feature.rms(y=y,frame_length=2048,hop_length=hop)[0]
    valid=(np.abs(pitch-midi)<.35)&(rms>max(float(np.max(rms))*.04,.0001))
    # Bridge gaps up to 3 frames, never enough to cross notes in the scale.
    for i in range(1,len(valid)-3):
        if valid[i-1] and not valid[i] and np.any(valid[i:i+3]):
            j=i+int(np.argmax(valid[i:i+3]));valid[i:j]=True
    edges=np.diff(np.r_[False,valid,False].astype(int))
    spans=list(zip(np.where(edges==1)[0],np.where(edges==-1)[0]))
    if not spans: raise ValueError(f'No reliable segment for MIDI {midi}')
    a,b=max(spans,key=lambda ab:ab[1]-ab[0])
    start=(a*hop/sr)+.06; end=min(b*hop/sr-.06,len(y)/sr)
    if end-start<.5: raise ValueError(f'Insufficient stable audio for MIDI {midi}: {end-start:.2f}s')
    end=min(end,start+1.8)
    return start,end

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--output',default='_site/audio');args=parser.parse_args()
    out=pathlib.Path(args.output);out.mkdir(parents=True,exist_ok=True);manifest={}
    with tempfile.TemporaryDirectory() as work:
        for string,span,index,midis in SOURCES:
            filename=f'Violin.arco.mf.sul{string}.{span}.mono.aif';source=BASE+filename
            path=pathlib.Path(work)/filename
            for attempt in range(3):
                try:
                    with urllib.request.urlopen(source,timeout=90) as response: path.write_bytes(response.read())
                    break
                except Exception:
                    if attempt==2: raise
                    time.sleep(2)
            wav=path.with_suffix('.wav')
            subprocess.run(['ffmpeg','-v','error','-y','-i',str(path),'-ac','1','-ar','22050',str(wav)],check=True)
            y,sr=librosa.load(wav,sr=22050,mono=True)
            for midi in midis:
                finger=OFFSETS.index(midi-BASES[index]);key=f'{index}-{finger}'
                start,end=best_segment(y,sr,midi);duration=end-start
                output=out/f'{key}.mp3'
                subprocess.run(['ffmpeg','-v','error','-y','-ss',str(start),'-i',str(wav),'-t',str(duration),'-af',f'afade=t=in:d=0.03,afade=t=out:st={duration-.1}:d=0.1,loudnorm=I=-20:TP=-2:LRA=7','-ar','44100','-ac','1','-b:a','96k',str(output)],check=True)
                if output.stat().st_size<2000: raise ValueError(f'Empty output: {key}')
                manifest[key]={'url':f'audio/{key}.mp3','midi':midi,'string':string,'source':source,'start':round(start,3),'duration':round(duration,3)}
                print(f'Validated {key}: MIDI {midi}, {duration:.2f}s',flush=True)
    expected={f'{s}-{f}' for s in range(4) for f in range(5)}
    if set(manifest)!=expected: raise ValueError('Missing notes; refusing incomplete deployment')
    (out/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (out/'CREDITS.txt').write_text('University of Iowa Musical Instrument Samples, Lawrence Fritts / Electronic Music Studios. Violin: Leonid Iogansen, recorded 2011. Arco, mezzo forte, by string. Sources: https://theremin.music.uiowa.edu/MISviolin2012.html . Usage permission: https://theremin.music.uiowa.edu/MIS.html (available for any projects without restrictions). Extracted, normalized and converted to MP3 for this app.\n')
if __name__=='__main__': main()
