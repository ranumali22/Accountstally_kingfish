export default function GlobalLoader() {
  return (
    <>
      {/* ✅ SAME CSS (component ke andar) */}
      <style>
        {`
          .gl-loader {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(255,255,255,0.15);
            backdrop-filter: blur(10px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 999999;
          }

          .gl-spinner {
            position: relative;
            width: 60px;
            height: 60px;
          }

          .gl-spinner div {
            position: absolute;
            width: 10px;
            height: 10px;
            background: #555;
            border-radius: 50%;
            top: 50%;
            left: 50%;
            transform-origin: -20px 0;
            animation: gl-rotate 1.2s linear infinite;
          }

          .gl-spinner div:nth-child(1) { transform: rotate(0deg); animation-delay: 0s; }
          .gl-spinner div:nth-child(2) { transform: rotate(45deg); animation-delay: 0.15s; }
          .gl-spinner div:nth-child(3) { transform: rotate(90deg); animation-delay: 0.3s; }
          .gl-spinner div:nth-child(4) { transform: rotate(135deg); animation-delay: 0.45s; }
          .gl-spinner div:nth-child(5) { transform: rotate(180deg); animation-delay: 0.6s; }
          .gl-spinner div:nth-child(6) { transform: rotate(225deg); animation-delay: 0.75s; }
          .gl-spinner div:nth-child(7) { transform: rotate(270deg); animation-delay: 0.9s; }
          .gl-spinner div:nth-child(8) { transform: rotate(315deg); animation-delay: 1.05s; }

          @keyframes gl-rotate {
            0%,100% {
              opacity: 0.2;
              transform: scale(0.7);
            }
            50% {
              opacity: 1;
              transform: scale(1.2);
            }
          }

          /* dark mode */
          body.dark .gl-spinner div {
            background: #fff;
          }
        `}
      </style>

      {/* ✅ SAME UI */}
      <div className="gl-loader">
        <div className="gl-spinner">
          {[...Array(8)].map((_, i) => (
            <div key={i}></div>
          ))}
        </div>
      </div>
    </>
  );
}