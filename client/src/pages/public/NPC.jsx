import { useState, useEffect } from 'react';
import PageHero from '../../components/common/PageHero';
import API from '../../api/axios';
import Icon from '../../components/common/Icon';
import { shortName } from '../../utils/names';
import { NPC_GROUPS } from '../../data/npcGroups';


export default function NPC() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/exco?scope=npc')
      .then(res => {
        const data = res.data?.exco || res.data?.data || res.data;
        if (Array.isArray(data) && data.length > 0) {
          setMembers(data.filter(m => m.isActive !== false));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <PageHero
        label="Governance"
        title="National Policy Committee"
        titleHighlight="Committee"
        backgroundImage="https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=1400&q=80&fit=crop"
      />

      <section style={{ background: '#fff' }}>
        <div className="ct" style={{ paddingTop: '4rem', paddingBottom: '4rem' }}>
          <div className="ey">Policy &amp; Strategy</div>
          <h2 className="sh">The <em>NPC</em></h2>
          <p className="sd" style={{ marginBottom: '3rem' }}>
            The NPC advises the Council on policy, strategy, and long-term direction, drawing from
            NIQS's most senior corporate members.
          </p>

          {loading ? (
            <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--color-txt-3)', fontSize: '.85rem' }}>
              Loading committee members…
            </div>
          ) : members.length > 0 ? (
            /* Names only, no portraits: the committee is a working body, not a
               gallery, and the review (Oct 2026) asked for a plain list. */
            <>
              {[...NPC_GROUPS, 'Members'].map(group => {
                const rows = members
                  .filter(m => (NPC_GROUPS.includes(m.group) ? m.group : 'Members') === group)
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                if (!rows.length) return null;
                return (
                  <div key={group} style={{ marginBottom: '2.4rem' }}>
                    <h3 className="roster-group">{group}</h3>
                    <div className="roster" role="table" aria-label={group}>
                      <div className="roster-row roster-head" role="row">
                        <span role="columnheader">#</span>
                        <span role="columnheader">Name</span>
                        <span className="roster-role" role="columnheader">Role</span>
                      </div>
                      {rows.map((m, i) => (
                        <div className="roster-row" role="row" key={m._id}>
                          <span className="roster-n" role="cell">{String(i + 1).padStart(2, '0')}</span>
                          <span className="roster-name" role="cell" title={m.name}>{shortName(m.name, { override: m.shortName })}</span>
                          <span className="roster-role" role="cell">{m.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div style={{
              padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--color-off)',
              borderRadius: 14, border: '1px dashed var(--color-bdr)',
            }}>
              <div style={{ marginBottom: '.6rem' }}><Icon name="institution" size="xl" /></div>
              <h4 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--color-navy)', marginBottom: '.4rem' }}>
                Committee roster being finalised
              </h4>
              <p style={{ fontSize: '.85rem', color: 'var(--color-txt-2)', maxWidth: 480, margin: '0 auto' }}>
                The National Policy Committee membership for the current administration will be
                published here once confirmed by the National Secretariat.
              </p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
