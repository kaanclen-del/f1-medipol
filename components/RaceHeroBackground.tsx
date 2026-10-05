"use client";

import { useEffect, useState } from "react";

type RaceHeroBackgroundProps = {
  images: string[];
};

export default function RaceHeroBackground({
  images,
}: RaceHeroBackgroundProps) {
  const [activeImage, setActiveImage] = useState(0);

  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      setActiveImage((current) => {
        return (current + 1) % images.length;
      });
    }, 7000);

    return () => clearInterval(timer);
  }, [images.length]);

  if (!images.length) {
    return (
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(135deg,#351d25,#1a2330 65%,#12171f)",
        }}
      />
    );
  }

  return (
    <>
      {images.map((image, index) => (
        <div
          key={image}
          style={{
            position: "absolute",
            inset: 0,

            backgroundImage: `url("${image}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",

            opacity:
              activeImage === index
                ? 1
                : 0,

            transform:
              activeImage === index
                ? "scale(1)"
                : "scale(1.04)",

            transition:
              "opacity 1.2s ease, transform 7s ease",

            zIndex: 0,
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,

          background:
            "linear-gradient(90deg, rgba(20,8,12,.95) 0%, rgba(28,15,21,.78) 45%, rgba(15,20,28,.50) 100%)",

          zIndex: 1,
        }}
      />
    </>
  );
}