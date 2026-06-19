export const DEFAULT_LEAGUES = ['世界杯', '英超', '西甲', '德甲', '意甲', '法甲', '欧冠', '国际赛', '非洲杯', '亚洲杯', '美洲杯'];

export const LEAGUE_CATS = [
  { name: '五大联赛', keys: ['英超', '西甲', '德甲', '意甲', '法甲'] },
  { name: '欧洲联赛', keys: ['英冠', '英甲', '德乙', '法乙', '荷甲', '荷乙', '葡超', '瑞超', '挪超', '俄超', '比甲', '芬超', '英锦标赛'] },
  { name: '国家队赛事', keys: ['世界杯', '世预赛', '欧洲杯', '欧锦赛', '欧预赛', '欧国联', '美洲杯', '非洲杯', '亚洲杯', '亚预赛', '国际赛', '女世界杯', '女亚洲杯', '奥运男足', '奥运女足', '亚运男足', '麒麟杯', '东亚锦', '女东亚锦', '金杯赛', '中北美冠'] },
  { name: '洲际俱乐部', keys: ['欧冠', '欧罗巴', '欧协联', '欧超杯', '亚冠精英', '亚冠乙', '解放者杯', '俱世界杯'] },
  { name: '亚洲及海外联赛', keys: ['日职', '日乙', '韩职', '澳超', '沙职', '美职', '巴甲', '墨超'] },
  { name: '各国杯赛', keys: ['英足总杯', '英联赛杯', '德国杯', '意大利杯', '法国杯', '西国王杯', '巴西杯', '日联赛杯', '日天皇杯', '韩国杯', '荷兰杯', '西超杯', '葡萄牙杯', '意超杯', '德超杯', '法联赛杯', '英社区盾', '澳大利亚杯', '挪威杯', '法超杯', '公开赛杯', '杯赛', 'Play-offs'] },
];

export function categorizeLeagues(allLeagues) {
  const used = {};
  const groups = LEAGUE_CATS.map(cat => {
    const list = allLeagues.filter(l => {
      if (used[l]) return false;
      const hit = cat.keys.some(k => l === k || l.indexOf(k) === 0);
      if (hit) used[l] = true;
      return hit;
    });
    return { name: cat.name, leagues: list };
  });
  const rest = allLeagues.filter(l => !used[l]);
  if (rest.length) groups.push({ name: '其他', leagues: rest });
  return groups.filter(g => g.leagues.length);
}
