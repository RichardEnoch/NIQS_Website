import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useEvents, { isUpcoming, TYPE_LABEL } from '../../hooks/useEvents';
import PageHero from '../../components/common/PageHero';
import Icon from '../../components/common/Icon';

/**
 * Filter chips → the Event model's `type` values.
 *
 * The chips used to be compared to `type` verbatim ('Conference', 'Examination',
 * 'Ceremony'), but the model stores lower-case enum values ('conference',
 * 'exam', …) and has no 'ceremony' at all, so every chip but All came back
 * empty. Each chip now names the enum values it covers.
 */
const TYPE_FILTERS = [
  { label: 'All',         types: null },
  { label: 'Conferences', types: ['conference', 'seminar', 'agm'] },
  { label: 'Workshops',   types: ['workshop', 'training'] },
  { label: 'Webinars',    types: ['webinar'] },
  { label: 'Examinations',types: ['exam'] },
  { label: 'Meetings',    types: ['meeting', 'social', 'other'] },
];


export default function Events() {
  const [activeType, setActiveType] = useState('All');
  // Same list, filter and order as the home page's events (hooks/useEvents).
  const { upcoming, past: pastAll, status } = useEvents();

  const chip = TYPE_FILTERS.find(f => f.label === activeType);
  const ofType = (list) => (chip?.types ? list.filter(e => chip.types.includes(e.type)) : list);

  /* Past events used to sit in the "Upcoming Events" list indefinitely, so by
     October the whole list was months out of date. Upcoming soonest first; past
     events move to their own list below, most recent first. */
  const filtered = ofType(upcoming);
  const past = ofType(pastAll);

  return (
    <>
      <PageHero
        label="Calendar"
        title="Events & Conferences"
        titleHighlight="Events"
        backgroundImage="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1400&q=80&fit=crop"
      />

      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '5rem', paddingBottom: '5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div className="ey">{new Date().getFullYear()} Calendar</div>
              <h2 className="sh" style={{ margin: 0 }}>Upcoming <em>Events</em></h2>
            </div>
            <div className="filter-bar" style={{ marginBottom: 0, marginTop: '.3rem' }}>
              {TYPE_FILTERS.map(({ label }) => (
                <button
                  key={label}
                  className={`fbtn${activeType === label ? ' on' : ''}`}
                  onClick={() => setActiveType(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="evtl">
            {filtered.map(e => {
              const d = new Date(e.date);
              return (
                <div className="erow" key={e._id}>
                  <div style={{ textAlign: 'center' }}>
                    <div className="eday">{d.getDate()}</div>
                    <div className="emon">{d.toLocaleDateString('en-NG', { month: 'short' }).toUpperCase()}</div>
                  </div>
                  <div className="einfo">
                    <h4>{e.title}</h4>
                    <p>{e.description}</p>
                    <p style={{ marginTop: '.3rem', fontSize: '.72rem', color: 'var(--color-txt-3)' }}>
                      <Icon name="location" size="sm" /> {e.location}
                      {e.endDate && (
                        <span style={{ marginLeft: '1rem' }}>
                          <Icon name="calendar" size="sm" /> {d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} — {new Date(e.endDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      )}
                    </p>
                  </div>
                  {/* The registration flow existed but nothing on the public site
                      reached it: this page rendered no links at all, and the
                      homepage's rows pointed at a slug the Event model does not
                      have. /events/:id/register, the Registration record, the
                      attendance token and the CPD credit behind it were therefore
                      unreachable — including for the National Workshop &
                      Induction. An event carrying its own registrationLink keeps
                      it; everything still to come uses the site's own form. */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.5rem' }}>
                    <span className="epill">{TYPE_LABEL[e.type] || e.type}</span>
                    {/* A webinar only registers through its own link — it has no
                        Event record behind it for the site's form to attach to. */}
                    {isUpcoming(e) && (e.registrationLink || !e.isWebinar) && (
                      e.registrationLink ? (
                        <a
                          href={e.registrationLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn bp"
                          style={{ fontSize: '.68rem', padding: '.35rem .9rem' }}
                        >
                          Register &rarr;
                        </a>
                      ) : (
                        <Link
                          to={`/events/${e._id}/register`}
                          className="btn bp"
                          style={{ fontSize: '.68rem', padding: '.35rem .9rem' }}
                        >
                          Register &rarr;
                        </Link>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <p style={{ textAlign: 'center', color: 'var(--color-txt-3)', marginTop: '2rem' }}>
              {status === 'loading'
                ? 'Loading events…'
                : status === 'error'
                  ? 'We could not load the events just now. Please try again shortly.'
                  : activeType === 'All'
                    ? 'No upcoming events at the moment. New dates are announced here first.'
                    : 'No upcoming events of this type.'}
            </p>
          )}

          {past.length > 0 && (
            <div style={{ marginTop: '4.5rem' }}>
              <div className="ey">Archive</div>
              <h3 className="sh" style={{ fontSize: '1.6rem', marginBottom: '1.5rem' }}>Past <em>Events</em></h3>
              <div className="evtl">
                {past.map(e => {
                  const d = new Date(e.date);
                  return (
                    <div className="erow" key={e._id} style={{ opacity: 0.8 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div className="eday">{d.getDate()}</div>
                        <div className="emon">{d.toLocaleDateString('en-NG', { month: 'short', year: '2-digit' }).toUpperCase()}</div>
                      </div>
                      <div className="einfo">
                        <h4>{e.title}</h4>
                        <p style={{ marginTop: '.3rem', fontSize: '.72rem', color: 'var(--color-txt-3)' }}>
                          <Icon name="location" size="sm" /> {e.location}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.5rem' }}>
                        <span className="epill">{TYPE_LABEL[e.type] || e.type}</span>
                        {e.recordingUrl && (
                          <a href={e.recordingUrl} target="_blank" rel="noopener noreferrer" className="btn bo" style={{ fontSize: '.68rem', padding: '.35rem .9rem' }}>
                            Watch recording
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
