import os, subprocess, sys, time, tempfile, json, collections
from playwright.sync_api import sync_playwright
R="/home/claude/consulente-digitale"; P=8875
dati=tempfile.mkdtemp()
json.dump({"tipo":"persona","nome":"Danilo"},open(os.path.join(dati,"profilo.json"),"w"))
env=dict(os.environ,CD_DATA_DIR=dati,CD_NOTIZIE_PROVA="1",CD_HARDWARE_PROVA="1",CD_APERTURE_PROVA="1")
srv=subprocess.Popen([sys.executable,R+"/src/server/cd_server.py","--port",str(P),"--inattivo","0"],env=env,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
time.sleep(2.5)
JS="""() => { const out=[]; const w=document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
 let n; while(n=w.nextNode()){ const p=n.parentElement; if(!p||/SCRIPT|STYLE|TEXTAREA|CODE|PRE/.test(p.tagName)||p.closest('svg,.console,pre,code')) continue; const t=n.nodeValue.replace(/\\s+/g,' ').trim(); if(t && /[a-zA-Zàèéìòù]/.test(t)) out.push(t); }
 document.querySelectorAll('[placeholder],[title],[aria-label]').forEach(e=>{['placeholder','title','aria-label'].forEach(a=>{const v=e.getAttribute(a); if(v&&/[a-zA-Z]/.test(v)) out.push(v.replace(/\\s+/g,' ').trim());});});
 return out; }"""
viste=["","neura","notizie","notizie/salvate","acquisti","acquisti/portatile","analisi","analisi/sistemi","analisi/migliorie","analisi/programmi","hardware","interventi","aggiornamenti","ottimizza","ottimizza/script/windows","ottimizza/esperti","ottimizza/soluzioni","ottimizza/guide","strumenti","strumenti/rete","strumenti/riparazioni","strumenti/ora","strumenti/apri","programmi","circolare","circolare/regole","circolare/consigli","circolare/domande","circolare/quiz","circolare/patto","sapere","storia","impostazioni","programma","sostieni","licenza","benvenuto"]
cnt=collections.Counter(); per={}
with sync_playwright() as p:
    b=p.chromium.launch(); pg=b.new_page(viewport={"width":1280,"height":900})
    for v in viste:
        pg.goto("http://127.0.0.1:%d/?nosaluto#/%s"%(P,v)); pg.wait_for_timeout(1800)
        if v=="hardware":
            for t in ["schema","cpu","memoria","grafica","dischi","batteria","periferiche","sensori"]:
                pg.click('[data-tab="%s"]'%t); pg.wait_for_timeout(600)
                for s in pg.evaluate(JS): cnt[s]+=1; per.setdefault(s,v+"/"+t)
        for s in pg.evaluate(JS): cnt[s]+=1; per.setdefault(s,v)
    pg.click("#btn-reset"); pg.wait_for_timeout(500)
    for s in pg.evaluate(JS): cnt[s]+=1; per.setdefault(s,"reset")
    b.close()
srv.terminate()
json.dump({"stringhe":[[s,cnt[s],per[s]] for s in cnt]},open(sys.argv[1],"w"),ensure_ascii=False,indent=0)
L=[s for s in cnt]; print(len(L), sum(len(s) for s in L), len([s for s in L if len(s)<=80]), sum(len(s) for s in L if len(s)<=80))
