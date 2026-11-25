import { useEffect, useState } from 'react'
import Logo from './Logo'

const BLOB = 'M40 -107C94 -89 124 -17 96 43C68 103 -14 127 -76 97C-138 67 -140 -1 -102 -43C-64 -85 -14 -125 40 -107Z'

const CSS = `
.intro{position:fixed;inset:0;z-index:3000;background:#0B3D2E;overflow:hidden;transition:opacity .35s ease}
.intro.leave{opacity:0;pointer-events:none}
.intro svg{position:absolute;inset:0;width:100%;height:100%}
.i-scene{animation:iOut .4s ease-in 3.4s both}
.i-ring{transform-box:fill-box;transform-origin:center;opacity:0;animation:iRing 1.1s cubic-bezier(.2,.7,.2,1) both}
.i-fade{opacity:0;animation:iFade .5s ease-out both}
.i-heap-in{transform-box:fill-box;transform-origin:50% 100%;animation:iPop .45s cubic-bezier(.3,1.4,.5,1) .45s both}
.i-heap-out{transform-box:fill-box;transform-origin:50% 100%;animation:iCollapse .35s ease-in 2.8s both}
.i-pin{animation:iDrop .8s cubic-bezier(.3,.7,.4,1) .65s both}
.i-pin-out{animation:iGone .2s ease-in 2.75s both}
.i-ping{transform-box:fill-box;transform-origin:center;opacity:0;animation:iPing 1.2s ease-out 2 both}
.i-truck{animation:iDrive 1.05s cubic-bezier(.15,.7,.25,1) 1.65s both}
.i-check{transform-box:fill-box;transform-origin:center;animation:iCheck .5s cubic-bezier(.3,1.5,.5,1) 2.85s both}
.i-tick{stroke-dasharray:32;stroke-dashoffset:32;animation:iTick .35s ease-out 3.1s forwards}
.i-burst{transform-box:fill-box;transform-origin:center;opacity:0;animation:iBurst .7s ease-out 2.95s both}
.i-cap-wrap{position:absolute;left:0;right:0;bottom:17%;height:44px;text-align:center}
.i-cap{position:absolute;left:0;right:0;margin:0;opacity:0;font-family:'Plus Jakarta Sans','Inter',system-ui,sans-serif;font-weight:800;font-size:26px;color:#fff;letter-spacing:-.01em;animation:iCap .95s ease both}
.i-brand{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;animation:iBrand .6s ease-out 3.7s both}
.i-word{margin:14px 0 0;font-family:'Plus Jakarta Sans','Inter',system-ui,sans-serif;font-weight:800;font-size:32px;color:#fff;letter-spacing:-.01em}
.i-tag{margin:6px 0 0;font-size:14px;color:rgba(255,255,255,.7)}
.i-skip{position:absolute;top:calc(env(safe-area-inset-top,0px) + 12px);right:12px;min-width:56px;min-height:44px;padding:0 14px;border:0;border-radius:22px;background:rgba(255,255,255,.12);color:rgba(255,255,255,.85);font-size:14px;font-weight:600;opacity:0;animation:iFade .4s ease-out 1s both}
.intro.quick .i-scene,.intro.quick .i-cap-wrap,.intro.quick .i-skip{display:none}
.intro.quick .i-brand{animation-delay:0s}
@keyframes iRing{from{opacity:0;transform:scale(.55)}to{opacity:1;transform:scale(1)}}
@keyframes iFade{to{opacity:1}}
@keyframes iOut{to{opacity:0}}
@keyframes iPop{from{opacity:0;transform:scale(.2)}to{opacity:1;transform:scale(1)}}
@keyframes iCollapse{to{opacity:0;transform:scale(.1)}}
@keyframes iDrop{0%{opacity:0;transform:translateY(-110px)}55%{opacity:1;transform:translateY(0)}72%{transform:translateY(-14px)}88%,100%{opacity:1;transform:translateY(0)}}
@keyframes iGone{to{opacity:0}}
@keyframes iPing{0%{opacity:.8;transform:scale(.6)}100%{opacity:0;transform:scale(4.5)}}
@keyframes iDrive{from{transform:translateX(-210px)}to{transform:translateX(0)}}
@keyframes iCheck{0%{opacity:0;transform:scale(.3)}60%{opacity:1;transform:scale(1.15)}100%{opacity:1;transform:scale(1)}}
@keyframes iTick{to{stroke-dashoffset:0}}
@keyframes iBurst{0%{opacity:1;transform:translate(0,0) scale(1)}100%{opacity:0;transform:translate(var(--dx),var(--dy)) scale(.4)}}
@keyframes iCap{0%{opacity:0;transform:translateY(10px)}18%{opacity:1;transform:none}78%{opacity:1;transform:none}100%{opacity:0;transform:translateY(-6px)}}
@keyframes iBrand{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){
  .intro .i-scene,.intro .i-cap-wrap,.intro .i-skip{display:none}
  .intro .i-brand{animation:none;opacity:1}
}
`

export default function Intro({ onDone, quick = false }) {
  const [leave, setLeave] = useState(false)

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const t1 = setTimeout(() => setLeave(true), reduce ? 900 : quick ? 1300 : 4250)
    const t2 = setTimeout(onDone, reduce ? 1250 : quick ? 1650 : 4600)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const skip = () => { setLeave(true); setTimeout(onDone, 250) }

  return (
    <div className={`intro ${leave ? 'leave' : ''} ${quick ? 'quick' : ''}`} role="img"
      aria-label="EcoTrack. Spot waste, report it, watch it cleared.">
      <style>{CSS}</style>

      <svg viewBox="0 0 400 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <g className="i-scene">
          <g transform="translate(200 360)">
            {[1.9, 1.55, 1.25, 0.98, 0.72, 0.48].map((s, i) => (
              <g key={i} transform={`rotate(${[0, 8, -6, 10, -8, 5][i]}) scale(${s})`}>
                <path className="i-ring" d={BLOB} fill="none" stroke="#fff" strokeOpacity=".10" strokeWidth="1.2"
                  style={{ animationDelay: i * 0.1 + 's' }} />
              </g>
            ))}
          </g>

          <line className="i-fade" style={{ animationDelay: '.3s' }} x1="20" y1="470" x2="380" y2="470"
            stroke="#fff" strokeOpacity=".28" strokeWidth="2" strokeDasharray="3 9" strokeLinecap="round" />

          <g className="i-heap-in"><g className="i-heap-out">
            <ellipse cx="198" cy="458" rx="17" ry="13" fill="#7A8F83" />
            <ellipse cx="224" cy="460" rx="15" ry="12" fill="#5F7468" />
            <ellipse cx="210" cy="444" rx="13" ry="11" fill="#93A79B" />
            <path d="M205 433q5-7 10 0" stroke="#5F7468" strokeWidth="2" fill="none" strokeLinecap="round" />
          </g></g>

          <ellipse className="i-ping" style={{ animationDelay: '1.3s' }} cx="210" cy="420" rx="9" ry="3.2"
            fill="none" stroke="#4ADE80" strokeWidth="1.6" />
          <ellipse className="i-ping" style={{ animationDelay: '1.65s' }} cx="210" cy="420" rx="9" ry="3.2"
            fill="none" stroke="#4ADE80" strokeWidth="1.6" />

          <g className="i-pin"><g className="i-pin-out">
            <g transform="translate(186 380) scale(1.5)">
              <path d="M16 5.5c-4.7 0-8.5 3.6-8.5 8.2 0 5.6 8.5 12.8 8.5 12.8s8.5-7.2 8.5-12.8c0-4.6-3.8-8.2-8.5-8.2z" fill="#fff" />
              <path d="M12 15c0-2.8 2.2-4 5-4 0 3.1-1.3 5.2-4 5.5z" fill="#118542" />
            </g>
          </g></g>

          <g className="i-truck"><g transform="translate(110 441)">
            <rect x="0" y="0" width="44" height="25" rx="4" fill="#118542" />
            <path d="M46 6h14l8 10v9H46z" fill="#4ADE80" />
            <rect x="52" y="9" width="9" height="7" rx="1.5" fill="#0B3D2E" opacity=".55" />
            <circle cx="12" cy="27" r="6" fill="#0B3D2E" stroke="#fff" strokeWidth="2" />
            <circle cx="56" cy="27" r="6" fill="#0B3D2E" stroke="#fff" strokeWidth="2" />
          </g></g>

          <g className="i-check">
            <circle cx="210" cy="400" r="22" fill="#4ADE80" />
            <path className="i-tick" d="M200 401l7 7 13-14" fill="none" stroke="#0B3D2E" strokeWidth="4.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {[[-46, -30], [46, -30], [-34, -52], [34, -52], [0, -62], [-58, 0], [58, 0]].map(([x, y], i) => (
            <circle key={i} className="i-burst" cx="210" cy="400" r="3" fill={i % 2 ? '#F5B335' : '#4ADE80'}
              style={{ '--dx': x + 'px', '--dy': y + 'px' }} />
          ))}
        </g>
      </svg>

      <div className="i-cap-wrap">
        <p className="i-cap" style={{ animationDelay: '.5s' }}>See waste?</p>
        <p className="i-cap" style={{ animationDelay: '1.4s' }}>Report it.</p>
        <p className="i-cap" style={{ animationDelay: '2.3s', animationDuration: '1.1s' }}>Watch it cleared.</p>
      </div>

      <div className="i-brand">
        <Logo size={76} />
        <p className="i-word">EcoTrack</p>
        <p className="i-tag">Report waste. Watch it cleared.</p>
      </div>

      <button type="button" className="i-skip" onClick={skip}>Skip</button>
    </div>
  )
}
