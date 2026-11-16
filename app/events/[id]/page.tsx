import Link from "next/link";
import { notFound } from "next/navigation";

import Header from "@/components/Header";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import { loadPublishedEvents } from "@/lib/public-events-cache";

export const dynamic = "force-dynamic";

type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: "watch_party" | "karting" | "talk" | "club" | "other";
  location_name: string | null;
  location_address: string | null;
  location_map_url: string | null;
  start_at: string;
  end_at: string | null;
  cover_image_url: string | null;
  registration_url: string | null;
  featured: boolean;
  is_published: boolean;
};

function getEventTypeLabel(type: EventRow["event_type"]) {
  switch (type) {
    case "watch_party":
      return "YARIŞ İZLEME";
    case "karting":
      return "KARTING";
    case "talk":
      return "SÖYLEŞİ";
    case "club":
      return "KULÜP";
    default:
      return "ETKİNLİK";
  }
}

function formatEventDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(new Date(date));
}

function formatEventTime(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(date));
}

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(date));
}

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const events = (await loadPublishedEvents()) as EventRow[];
  const event = events.find((item) => item.id === id);

  if (!event) notFound();

  const now = Date.now();
  const isUpcoming = new Date(event.start_at).getTime() >= now;

  const relatedEvents = events
    .filter(
      (item) =>
        item.id !== event.id &&
        new Date(item.start_at).getTime() >= now
    )
    .sort(
      (a, b) =>
        new Date(a.start_at).getTime() -
        new Date(b.start_at).getTime()
    )
    .slice(0, 3);

  const locationText = [
    event.location_name,
    event.location_address,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Header />

      <main className="event-detail-page">
        <div className="event-detail-container">
          <Link href="/events" className="event-back-link">
            <span aria-hidden="true">←</span>
            TÜM ETKİNLİKLERE DÖN
          </Link>

          <div className="event-detail-grid">
            <section className="event-main-column">
              <div className="event-hero">
                {event.cover_image_url ? (
                  <img
                    className="event-hero-image"
                    src={event.cover_image_url}
                    alt={event.title}
                    fetchPriority="high"
                  />
                ) : (
                  <div className="event-hero-placeholder">
                    <span>F1</span>
                    <small>F1 SOCIAL EVENTS</small>
                  </div>
                )}

                <div className="event-hero-overlay" />

                <div className="event-hero-content">
                  <div className="event-badges">
                    {event.featured && (
                      <span className="event-featured-badge">
                        ÖNE ÇIKAN ETKİNLİK
                      </span>
                    )}
                    <span className="event-type-badge">
                      {getEventTypeLabel(event.event_type)}
                    </span>
                    <span
                      className={`event-status-badge ${
                        isUpcoming ? "is-upcoming" : "is-past"
                      }`}
                    >
                      {isUpcoming ? "YAKLAŞAN ETKİNLİK" : "TAMAMLANDI"}
                    </span>
                  </div>

                  <h1>{event.title}</h1>

                  <div className="event-hero-meta">
                    <span>
                      <span aria-hidden="true">▦</span>
                      {formatEventDate(event.start_at)}
                    </span>
                    <span>
                      <span aria-hidden="true">◷</span>
                      {formatEventTime(event.start_at)}
                    </span>
                    {event.location_name && (
                      <span>
                        <span aria-hidden="true">⌖</span>
                        {event.location_name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <section className="event-info-card">
                <div className="event-section-eyebrow">
                  ABOUT THE EVENT
                </div>
                <h2>Etkinlik Hakkında</h2>

                {event.description ? (
                  <p className="event-description">
                    {event.description}
                  </p>
                ) : (
                  <p className="event-description event-muted">
                    Bu etkinlik için henüz bir açıklama eklenmemiş.
                  </p>
                )}

                <div className="event-info-divider" />

                <div className="event-facts">
                  <div>
                    <span className="event-fact-label">TARİH</span>
                    <strong>{formatEventDate(event.start_at)}</strong>
                  </div>
                  <div>
                    <span className="event-fact-label">SAAT</span>
                    <strong>{formatEventTime(event.start_at)}</strong>
                  </div>
                  <div>
                    <span className="event-fact-label">ETKİNLİK TÜRÜ</span>
                    <strong>{getEventTypeLabel(event.event_type)}</strong>
                  </div>
                </div>
              </section>
            </section>

            <aside className="event-sidebar">
              <section className="event-action-card">
                <h2>Bu etkinlikte yerini al.</h2>
                <p>
                  F1 Social topluluğuyla bir araya gel, yarış heyecanını
                  birlikte yaşa.
                </p>

                {event.registration_url ? (
                  <a
                    href={event.registration_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="event-join-button"
                  >
                    ETKİNLİĞE KATIL
                    <span aria-hidden="true">↗</span>
                  </a>
                ) : (
                  <div className="event-no-registration">
                    Katılım bağlantısı henüz paylaşılmadı.
                  </div>
                )}

                <div className="event-calendar-wrap">
                  <AddToCalendarButton
                    id={event.id}
                    title={event.title}
                    description={event.description}
                    location={locationText || null}
                    startAt={event.start_at}
                    endAt={event.end_at}
                  />
                </div>
              </section>

              <section className="event-location-card">
                <h2>Mekan</h2>

                {event.location_name ? (
                  <>
                    {event.location_map_url ? (
                      <a
                        href={event.location_map_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="event-location-name"
                      >
                        {event.location_name}
                        <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <div className="event-location-name">
                        {event.location_name}
                      </div>
                    )}

                    {event.location_address && (
                      <p className="event-location-address">
                        {event.location_address}
                      </p>
                    )}

                  </>
                ) : (
                  <p className="event-location-address">
                    Mekan bilgisi henüz paylaşılmadı.
                  </p>
                )}
              </section>
            </aside>
          </div>

          {relatedEvents.length > 0 && (
            <section className="event-related-section">
              <div className="event-section-eyebrow">
                MORE FROM F1 SOCIAL
              </div>
              <div className="event-related-heading">
                <div>
                  <h2>Yaklaşan Etkinlikler</h2>
                  <p>Takvimdeki diğer buluşmaları keşfet.</p>
                </div>
                <Link href="/events">TÜM ETKİNLİKLER →</Link>
              </div>

              <div className="event-related-grid">
                {relatedEvents.map((item) => (
                  <Link
                    href={`/events/${item.id}`}
                    className="event-related-card"
                    key={item.id}
                  >
                    <div className="event-related-image">
                      {item.cover_image_url ? (
                        <img src={item.cover_image_url} alt={item.title} />
                      ) : (
                        <span>F1</span>
                      )}
                      <span className="event-related-type">
                        {getEventTypeLabel(item.event_type)}
                      </span>
                    </div>
                    <div className="event-related-content">
                      <span className="event-related-date">
                        {formatShortDate(item.start_at)} ·{" "}
                        {formatEventTime(item.start_at)}
                      </span>
                      <h3>{item.title}</h3>
                      <span className="event-related-link">
                        ETKİNLİĞİ İNCELE →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <style>{`
        .event-detail-page {
          min-height: 100vh;
          padding: 30px 0 90px;
          color: var(--text, #f4f6f8);
        }

        .event-detail-container {
          width: min(1180px, calc(100% - 40px));
          margin: 0 auto;
        }

        .event-back-link {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 22px;
          color: #a6afbb;
          font-size: 10px;
          font-weight: 900;
          letter-spacing: .09em;
          text-decoration: none;
          transition: color .2s ease;
        }

        .event-back-link:hover {
          color: #ff514b;
        }

        .event-back-link span {
          font-size: 18px;
        }

        .event-detail-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.65fr) minmax(290px, .85fr);
          align-items: start;
          gap: 20px;
        }

        .event-main-column,
        .event-sidebar {
          display: grid;
          gap: 18px;
          min-width: 0;
        }

        .event-hero {
          position: relative;
          display: flex;
          min-height: 430px;
          align-items: flex-end;
          overflow: hidden;
          isolation: isolate;
          border: 1px solid rgba(255,255,255,.09);
          border-radius: 19px;
          background: linear-gradient(135deg,#302127,#18212b);
        }

        .event-hero-image {
          position: absolute;
          z-index: -3;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .event-hero-placeholder {
          position: absolute;
          z-index: -3;
          inset: 0;
          display: grid;
          place-content: center;
          justify-items: center;
          gap: 8px;
          background: radial-gradient(circle at 70% 30%,rgba(225,6,0,.3),transparent 38%),linear-gradient(135deg,#302127,#18212b);
        }

        .event-hero-placeholder span {
          color: rgba(255,255,255,.16);
          font-size: 130px;
          font-weight: 1000;
          font-style: italic;
        }

        .event-hero-placeholder small {
          color: rgba(255,255,255,.48);
          font-size: 9px;
          font-weight: 900;
          letter-spacing: .2em;
        }

        .event-hero-overlay {
          position: absolute;
          z-index: -2;
          inset: 0;
          background: linear-gradient(90deg,rgba(9,12,17,.92),rgba(9,12,17,.48) 72%,rgba(9,12,17,.15)),linear-gradient(0deg,rgba(9,12,17,.97),transparent 78%);
        }

        .event-hero-content {
          width: 100%;
          padding: 34px;
        }

        .event-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          margin-bottom: 15px;
        }

        .event-badges span {
          display: inline-flex;
          align-items: center;
          min-height: 25px;
          padding: 0 10px;
          border-radius: 999px;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .06em;
        }

        .event-featured-badge {
          color: white;
          background: #e10600;
        }

        .event-type-badge,
        .event-status-badge {
          color: #e1e6ec;
          border: 1px solid rgba(255,255,255,.2);
          background: rgba(8,12,18,.55);
          backdrop-filter: blur(8px);
        }

        .event-status-badge.is-upcoming {
          color: #ffaaa6;
          border-color: rgba(225,6,0,.45);
        }

        .event-status-badge.is-past {
          color: #c0c7d0;
        }

        .event-hero h1 {
          max-width: 760px;
          margin: 0;
          color: #fff;
          font-size: clamp(32px,4.2vw,54px);
          line-height: 1.04;
          font-weight: 1000;
          letter-spacing: -.055em;
          text-wrap: balance;
        }

        .event-hero-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 10px 19px;
          margin-top: 20px;
          color: #d0d6df;
          font-size: 11px;
          font-weight: 800;
        }

        .event-hero-meta span {
          display: inline-flex;
          align-items: center;
          gap: 7px;
        }

        .event-hero-meta span span {
          color: #ff625b;
          font-size: 15px;
        }

        .event-info-card,
        .event-action-card,
        .event-location-card {
          padding: 25px;
          border: 1px solid var(--border, rgba(255,255,255,.09));
          border-radius: 17px;
          background: var(--card, rgba(255,255,255,.035));
        }

        .event-section-eyebrow {
          color: #ff625b;
          font-size: 9px;
          font-weight: 1000;
          letter-spacing: .16em;
        }

        .event-info-card h2,
        .event-action-card h2,
        .event-location-card h2 {
          margin: 8px 0 13px;
          color: var(--text, #f4f6f8);
          font-size: 24px;
          font-weight: 950;
          letter-spacing: -.04em;
        }

        .event-description {
          margin: 0;
          color: var(--muted, #a3adba);
          font-size: 13px;
          line-height: 1.85;
          white-space: pre-line;
        }

        .event-muted {
          opacity: .7;
        }

        .event-info-divider {
          height: 1px;
          margin: 22px 0;
          background: var(--border, rgba(255,255,255,.09));
        }

        .event-facts {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 15px;
        }

        .event-facts > div {
          display: grid;
          gap: 7px;
          min-width: 0;
        }

        .event-fact-label {
          color: #818d9c;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .1em;
        }

        .event-facts strong {
          color: var(--text, #f4f6f8);
          font-size: 11px;
          line-height: 1.5;
          overflow-wrap: anywhere;
        }

        .event-action-card,
        .event-location-card {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255,65,65,.24);
          background:
            radial-gradient(ellipse at 100% 0,rgba(225,6,0,.19),transparent 55%),
            linear-gradient(145deg,rgba(31,37,48,.96),rgba(13,17,25,.96));
          box-shadow:
            0 15px 45px rgba(0,0,0,.20),
            inset 0 1px 0 rgba(255,255,255,.055);
          backdrop-filter: blur(18px);
          transition: border-color .25s ease, transform .25s ease, box-shadow .25s ease;
        }

        .event-action-card::before,
        .event-location-card::before {
          content: "";
          position: absolute;
          top: 0;
          left: 25px;
          width: 65px;
          height: 2px;
          background: linear-gradient(90deg,#e10600,rgba(255,75,75,.1));
          box-shadow: 0 0 15px rgba(225,6,0,.7);
        }

        .event-action-card:hover,
        .event-location-card:hover {
          transform: translateY(-3px);
          border-color: rgba(255,65,65,.48);
          box-shadow:
            0 20px 50px rgba(0,0,0,.3),
            0 0 25px rgba(225,6,0,.07),
            inset 0 1px 0 rgba(255,255,255,.07);
        }

        .event-action-card > *,
        .event-location-card > * {
          position: relative;
          z-index: 1;
        }

        .event-action-card h2 {
          font-size: 25px;
        }

        :root[data-site-theme="light"] .event-action-card,
        :root[data-site-theme="light"] .event-location-card {
          background: #ffffff;
          border-color: #e5e7eb;
          box-shadow: 0 12px 32px rgba(20, 30, 45, .08);
        }

        :root[data-site-theme="light"] .event-action-card h2,
        :root[data-site-theme="light"] .event-location-card h2,
        :root[data-site-theme="light"] .event-location-name {
          color: #171b22;
        }

        :root[data-site-theme="light"] .event-action-card > p,
        :root[data-site-theme="light"] .event-location-address {
          color: #515b68;
        }

        :root[data-site-theme="light"] .event-action-card .event-no-registration {
          color: #343b46;
        }

        .event-action-card > p {
          margin: 0 0 20px;
          color: var(--muted, #a3adba);
          font-size: 12px;
          line-height: 1.75;
        }

        .event-join-button {
          display: flex;
          min-height: 48px;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 0 17px;
          border-radius: 10px;
          color: #fff;
          background: linear-gradient(110deg,#e10600,#b90000);
          box-shadow: 0 9px 25px rgba(225,6,0,.2);
          font-size: 10px;
          font-weight: 1000;
          letter-spacing: .07em;
          text-decoration: none;
          transition: transform .2s ease,filter .2s ease;
        }

        .event-join-button:hover {
          transform: translateY(-2px);
          filter: brightness(1.12);
        }

        .event-join-button span {
          font-size: 17px;
        }

        .event-no-registration {
          padding: 13px;
          border: 1px solid var(--border,rgba(255,255,255,.09));
          border-radius: 10px;
          color: var(--muted,#a3adba);
          font-size: 11px;
          line-height: 1.6;
        }

        .event-calendar-wrap {
          margin-top: 11px;
        }

        .event-calendar-wrap > * {
          width: 100%;
        }


        .event-location-name {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          color: var(--text,#f4f6f8);
          font-size: 15px;
          font-weight: 900;
          text-decoration: none;
        }

        a.event-location-name:hover {
          color: #ff625b;
        }

        .event-location-name span {
          color: #ff625b;
        }

        .event-location-address {
          margin: 8px 0 0;
          color: var(--muted,#a3adba);
          font-size: 11px;
          line-height: 1.65;
        }

        .event-map-preview {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 76px;
          margin-top: 17px;
          padding: 12px;
          overflow: hidden;
          border: 1px solid var(--border,rgba(255,255,255,.1));
          border-radius: 12px;
          color: var(--text,#f4f6f8);
          background: linear-gradient(120deg,rgba(225,6,0,.10),rgba(255,255,255,.025));
          text-decoration: none;
        }

        .event-map-pin {
          display: grid;
          width: 39px;
          height: 39px;
          flex-shrink: 0;
          place-items: center;
          border-radius: 11px;
          color: #ff625b;
          background: rgba(225,6,0,.13);
          font-size: 23px;
        }

        .event-map-preview > span:nth-child(2) {
          display: grid;
          gap: 4px;
          min-width: 0;
        }

        .event-map-preview strong {
          font-size: 10px;
        }

        .event-map-preview small {
          color: var(--muted,#a3adba);
          font-size: 9px;
        }

        .event-map-arrow {
          margin-left: auto;
          color: #ff625b;
        }

        .event-map-unavailable {
          margin-top: 14px;
          color: var(--muted,#a3adba);
          font-size: 11px;
        }

        .event-related-section {
          margin-top: 38px;
        }

        .event-related-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin: 8px 0 17px;
        }

        .event-related-heading h2 {
          margin: 0;
          color: var(--text,#f4f6f8);
          font-size: 28px;
          font-weight: 950;
          letter-spacing: -.045em;
        }

        .event-related-heading p {
          margin: 6px 0 0;
          color: var(--muted,#a3adba);
          font-size: 11px;
        }

        .event-related-heading > a {
          color: #ff625b;
          font-size: 9px;
          font-weight: 1000;
          text-decoration: none;
          white-space: nowrap;
        }

        .event-related-grid {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 14px;
        }

        .event-related-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid var(--border,rgba(255,255,255,.09));
          border-radius: 14px;
          color: inherit;
          background: var(--card,rgba(255,255,255,.035));
          text-decoration: none;
          transition: transform .2s ease,border-color .2s ease;
        }

        .event-related-card:hover {
          transform: translateY(-3px);
          border-color: rgba(225,6,0,.55);
        }

        .event-related-image {
          position: relative;
          display: grid;
          height: 145px;
          place-items: center;
          overflow: hidden;
          background: linear-gradient(135deg,#302127,#18212b);
        }

        .event-related-image img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .35s ease;
        }

        .event-related-card:hover .event-related-image img {
          transform: scale(1.04);
        }

        .event-related-image > span:first-child:not(.event-related-type) {
          color: rgba(255,255,255,.17);
          font-size: 65px;
          font-weight: 1000;
          font-style: italic;
        }

        .event-related-type {
          position: absolute;
          top: 11px;
          left: 11px;
          padding: 6px 9px;
          border-radius: 999px;
          color: white;
          background: rgba(8,12,18,.78);
          font-size: 8px;
          font-weight: 1000;
          backdrop-filter: blur(8px);
        }

        .event-related-content {
          display: grid;
          gap: 8px;
          padding: 15px;
        }

        .event-related-date {
          color: #ff625b;
          font-size: 9px;
          font-weight: 900;
        }

        .event-related-content h3 {
          margin: 0;
          color: var(--text,#f4f6f8);
          font-size: 16px;
          line-height: 1.3;
        }

        .event-related-link {
          margin-top: 5px;
          color: #aab4c0;
          font-size: 8px;
          font-weight: 1000;
          letter-spacing: .06em;
        }

        @media (max-width: 850px) {
          .event-detail-grid {
            grid-template-columns: minmax(0,1fr);
          }

          .event-sidebar {
            grid-template-columns: repeat(2,minmax(0,1fr));
            align-items: start;
          }

          .event-hero {
            min-height: 390px;
          }
        }

        @media (max-width: 600px) {
          .event-detail-page {
            padding-top: 20px;
            padding-bottom: 55px;
          }

          .event-detail-container {
            width: min(100% - 28px,1180px);
          }

          .event-back-link {
            margin-bottom: 15px;
            font-size: 9px;
          }

          .event-detail-grid,
          .event-main-column,
          .event-sidebar {
            gap: 12px;
          }

          .event-hero {
            min-height: 420px;
            border-radius: 14px;
          }

          .event-hero-content {
            padding: 21px;
          }

          .event-hero h1 {
            font-size: clamp(31px,9vw,43px);
          }

          .event-hero-meta {
            display: grid;
            gap: 9px;
            font-size: 10px;
          }

          .event-sidebar {
            grid-template-columns: minmax(0,1fr);
          }

          .event-info-card,
          .event-action-card,
          .event-location-card {
            padding: 19px;
            border-radius: 14px;
          }

          .event-info-card h2,
          .event-location-card h2 {
            font-size: 21px;
          }

          .event-facts {
            grid-template-columns: minmax(0,1fr);
            gap: 13px;
          }

          .event-facts > div {
            grid-template-columns: 105px minmax(0,1fr);
            align-items: start;
          }

          .event-related-heading {
            align-items: flex-start;
          }

          .event-related-heading h2 {
            font-size: 23px;
          }

          .event-related-heading > a {
            padding-top: 5px;
            font-size: 8px;
          }

          .event-related-grid {
            grid-template-columns: minmax(0,1fr);
          }

          .event-related-card {
            display: grid;
            grid-template-columns: 112px minmax(0,1fr);
          }

          .event-related-image {
            height: 100%;
            min-height: 125px;
          }

          .event-related-content {
            align-content: center;
            padding: 12px;
          }

          .event-related-content h3 {
            font-size: 14px;
          }
        }
      `}</style>
    </>
  );
}
