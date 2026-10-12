"use client";

import {
  useEffect,
} from "react";

export default function PaddockPostFocus() {
  useEffect(() => {
    function focusPost() {
      const hash =
        window.location.hash;

      if (
        !hash.startsWith(
          "#post-"
        )
      ) {
        return;
      }

      const id =
        decodeURIComponent(
          hash.slice(1)
        );

      const element =
        document.getElementById(
          id
        );

      if (!element) {
        return;
      }

      /*
        Header'ın altında kalmaması için
        biraz gecikmeli şekilde doğru
        pozisyona kaydırıyoruz.
      */

      window.setTimeout(
        () => {
          const headerOffset =
            105;

          const top =
            element.getBoundingClientRect()
              .top +
            window.scrollY -
            headerOffset;

          window.scrollTo({
            top,
            behavior:
              "smooth",
          });

          element.classList.add(
            "paddock-post-focused"
          );

          window.setTimeout(
            () => {
              element.classList.remove(
                "paddock-post-focused"
              );
            },
            3200
          );
        },
        120
      );
    }

    focusPost();

    window.addEventListener(
      "hashchange",
      focusPost
    );

    return () => {
      window.removeEventListener(
        "hashchange",
        focusPost
      );
    };
  }, []);

  return (
    <style>{`
      /*
        Profil üzerinden açılan
        Paddock gönderisinin
        kısa süreli vurgusu.
      */

      .paddock-post-focused {
        position: relative;

        z-index: 3;

        border-radius:
          14px !important;

        background:
          linear-gradient(
            135deg,
            rgba(225,6,0,.10),
            rgba(225,6,0,.025)
          ) !important;

        box-shadow:
          0 0 0 1px
          rgba(255,67,60,.60),
          0 0 34px
          rgba(225,6,0,.20) !important;

        animation:
          paddockFocusPulse
          1.15s ease
          2;

        transition:
          background .35s ease,
          box-shadow .35s ease,
          transform .35s ease;

        transform:
          translateY(-2px);
      }

      @keyframes paddockFocusPulse {
        0% {
          box-shadow:
            0 0 0 1px
            rgba(255,67,60,.35),
            0 0 15px
            rgba(225,6,0,.10);
        }

        50% {
          box-shadow:
            0 0 0 1px
            rgba(255,67,60,.90),
            0 0 45px
            rgba(225,6,0,.32);
        }

        100% {
          box-shadow:
            0 0 0 1px
            rgba(255,67,60,.35),
            0 0 15px
            rgba(225,6,0,.10);
        }
      }
    `}</style>
  );
}