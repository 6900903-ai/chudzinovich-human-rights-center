const DETENTION = ['задержан','задержали','задержание','затрыманы','затрыманая','затрымалі','затрыманне','арестован','арестовали','арест','арыштаваны','арыштаваная','арышт'];
const POLITICAL = ['политическ','палітычн','протест','пратэст','выбор','выбар','экстремист','экстрэміс','дискредитац','дыскрэдытац','лукашенко','лукашэнк','активист','актывіст','правозащит','праваабарон','журналист','журналіст','свобода слова','свабода слова','несанкционированн','несанкцыянаван','содействие экстремист','садзейнічанне экстрэміс','разжигание вражды','распальванне варожасці','2020'];
const ORDINARY = ['наркотик','наркоты','мошеннич','махляр','дтп','авария','краже','кража','крадзеж','разбой','рабаванне','бытов','бытавы','пьяный','п’яны','алкогол','контрабанд','незаконный оборот оружия','незаконны абарот зброі'];
const HUMAN_RIGHTS = ['пытк','катаван','политзаключ','палітвяз','палітзнявол','права человека','правы чалавека','условия содержания','ўмовы ўтрымання','карцер','штрафной изолятор','шизо','шыза','лишен переписки','пазбаўлен перапіскі'];

function norm(value='') { return String(value).toLocaleLowerCase('ru').normalize('NFD').replace(/\p{Diacritic}/gu,'').replaceAll('ё','е'); }
function hasAny(text, words) { return words.some(word => text.includes(norm(word))); }

export function eventHintForText(input) {
  const t = norm(input);
  if (hasAny(t,['погиб','умер','смерть','загіну','памер','смерць'])) return 'DEATH';
  if (hasAny(t,['пытк','катаван'])) return 'TORTURE';
  if (hasAny(t,['освобожден','освободили','вызвалены','вызвалілі'])) return 'RELEASE';
  if (hasAny(t,['приговор','прысуд','осудили','асудзілі'])) return 'SENTENCE';
  if (hasAny(t,['суд','процесс','працэс'])) return 'TRIAL';
  if (hasAny(t,['обыск','ператрус'])) return 'SEARCH';
  if (hasAny(t,['уголовное дело','крымінальная справа'])) return 'CRIMINAL_CASE';
  if (hasAny(t,['арестован','арестовали','арыштаваны','арышт'])) return 'ARREST';
  if (hasAny(t,DETENTION)) return 'DETENTION';
  if (hasAny(t,['этапирован','переведен в колони','пераведзен','этапаваны'])) return 'TRANSFER';
  if (hasAny(t,['условия содержания','ўмовы ўтрымання','карцер','шизо','шыза'])) return 'CONDITIONS';
  return 'UNKNOWN';
}

export function highRiskFlagsForText(input) {
  const t = norm(input); const flags = [];
  if (hasAny(t,['погиб','умер','смерть','загіну','памер','смерць'])) flags.push('DEATH');
  if (hasAny(t,['самоубий','суицид','самагуб'])) flags.push('SUICIDE');
  if (hasAny(t,['пытк','катаван'])) flags.push('TORTURE');
  if (hasAny(t,['сексуальн насили','сексуалізаван','изнасилован','згвалтаван'])) flags.push('SEXUAL_VIOLENCE');
  if (hasAny(t,['тяжелое состояние','серьезные проблемы со здоровьем','цяжкі стан','сур’езныя праблемы са здароўем'])) flags.push('SERIOUS_HEALTH');
  if (hasAny(t,['пропал без вести','исчез','знік','знікла'])) flags.push('DISAPPEARANCE');
  if (hasAny(t,['несовершеннолет','непаўналетн'])) flags.push('MINOR');
  return [...new Set(flags)];
}

export function classifyMediaText({ title='', summary='', body='', foreignJurisdiction=false } = {}) {
  const text = norm(`${title}\n${summary}\n${body}`);
  const event_hint = eventHintForText(text);
  const high_risk_flags = highRiskFlagsForText(text);
  if (!text.trim()) return { classification:'UNKNOWN', event_hint, high_risk_flags, reasons:['EMPTY_TEXT'] };
  if (foreignJurisdiction) return { classification:'FOREIGN_JURISDICTION', event_hint, high_risk_flags, reasons:['EXPLICIT_FOREIGN_JURISDICTION'] };
  const politicalNegated = hasAny(text,['политический контекст отсутствует','без политического контекста','палітычны кантэкст адсутнічае','без палітычнага кантэксту']);
  const political = hasAny(text,POLITICAL) && !politicalNegated;
  const ordinary = hasAny(text,ORDINARY);
  const rights = hasAny(text,HUMAN_RIGHTS);
  const coerciveEvent = ['DETENTION','ARREST','SEARCH','CRIMINAL_CASE','TRIAL','SENTENCE','TRANSFER'].includes(event_hint);
  if (ordinary && !political && !rights) return { classification:'ORDINARY_CRIME', event_hint, high_risk_flags, reasons:['ORDINARY_CRIME_SIGNAL_WITHOUT_POLITICAL_CONTEXT'] };
  if (political && coerciveEvent) return { classification:'POLITICAL_REPRESSION_CANDIDATE', event_hint, high_risk_flags, reasons:['POLITICAL_CONTEXT','COERCIVE_EVENT'] };
  if (rights || high_risk_flags.length) return { classification:'HUMAN_RIGHTS_RELEVANT', event_hint, high_risk_flags, reasons:['HUMAN_RIGHTS_SIGNAL'] };
  return { classification:'UNKNOWN', event_hint, high_risk_flags, reasons:['INSUFFICIENT_CONTEXT'] };
}

export const CLASSIFIER_POLICY = Object.freeze({keywords_are_discovery_only:true,media_report_is_political_prisoner_designation:false,high_risk_autopublish:false});
