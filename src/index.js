/**
 * @author 梁伯豪 PakhoLeung
 * @version 0.0.1
 * @license MIT
 *
 * @description
 * sitemap生成器，定制化，基于sitemap-generator: https://github.com/lgraubner/sitemap-generator
 * 添加了爬虫不能识别的动态url，添加了一个可自定义频率和优先级的callback函数
 *
 * 使用commander命令行，
 * -o --output <path> 指定输出目录，默认程序根目录下的./dist/sitemap.xml
 * -s --silent 静默运行
 */
const SitemapGenerator = require('./sitemap-generator');
const path = require('path');
const program = require('commander');
const axios = require('axios');


program
  .version('0.0.1')
  .option('-o, --output <path>', 'specific output directory', path.resolve(__dirname, '../dist/sitemap.xml'))
  .option('-s, --silent', 'silent log')
  .parse(process.argv);


function log(...args) {
  if(!program.silent) console.log(...args);
}

  const targetUrl = 'https://qz.fkw.com';



log('target url:', targetUrl);
log('output file:', program.output);

function customPriorityFreq(url) {
  const map = new Map(
    [
      [`^${targetUrl}\/?$`, { priority: '1.0', changeFreq: 'always' }],
      [`^${targetUrl}\/?blog(?:\.html)?$`, { priority: '0.9', changeFreq: 'hourly' }],
      [`^${targetUrl}\/?weixin(?:\.html)?$`, { priority: '0.9', changeFreq: 'daily' }],
      [`^${targetUrl}\/?blog~818.*?(?:\.html)?$`, { priority: '0.8', changeFreq: 'hourly' }],
      [`^${targetUrl}\/?model(?:\.html)?$`, { priority: '0.8', changeFreq: 'weekly' }],
      [`^${targetUrl}\/?baidu(?:\.html)?$`, { priority: '0.7', changeFreq: 'daily' }],
      [`^${targetUrl}\/?blog~((?!818).*?)(?:\.html)?$`, { priority: '0.6', changeFreq: 'weekly' }],
      [`^${targetUrl}\/?case(?:\.html)?$`, { priority: '0.5', changeFreq: 'monthly' }],
      [`^${targetUrl}\/?reg(?:\.html)?$`, { priority: '0.2', changeFreq: 'monthly' }],
      [`^${targetUrl}\/?proFunc(?:\.html)?$`, { priority: '0.3', changeFreq: 'monthly' }],
      [`^${targetUrl}\/?blog/.*?(?:\.html)?$`, { priority: '0.4', changeFreq: 'weekly' }],
      [`^${targetUrl}\/?model-.*?(?:\.html)?$`, { priority: '0.2', changeFreq: 'monthly' }],
      [`^${targetUrl}\/?case-.*?(?:\.html)?$`, { priority: '0.1', changeFreq: 'monthly' }]
    ]
  )

  for (let [key, value] of map) {
    if(new RegExp(key).test(url)) {
      return value
    };
  }
  return {};
}

const generator = SitemapGenerator(targetUrl, {
  stripQuerystring: false,
  filepath: program.output,
  changeFreq: 'monthly',
  priorityMap: [1.0, 0.8, 0.6, 0.4, 0.2, 0],
  lastMod: true,
  customPriorityFreq,
});


const crawler = generator.getCrawler();
const sitemap = generator.getSitemap()

// 添加model动态url
crawler.on('crawlstart', () => {
  axios.get('https://qz.fkw.com/ajax/model_h.jsp?cmd=getPageData')
  .then((response) => {
    const data = response.data;
    const tradeList = data.kindData.tradeList;
    // 构造Url
    const lastMod = response.headers['last-modified'];
    // sitemap.addURL(url, depth, lastMod && format(lastMod, 'YYYY-MM-DD'));
    const urls = tradeList.map(item => `https://qz.fkw.com/model-0-${item.id}.html`);
    urls.forEach(url => {
      // emitter.emit('add', url);
      // sitemap.addURL(url, 3, lastMod && format(lastMod, 'YYYY-MM-DD'))
      crawler.queueURL(url);
    });
  })
})

generator.on('add', function(url) {
  log('add: ', url);
})
generator.on('ignore', (url) => {
  log('ignore: ', url);
});
generator.on('done', function() {
  log('done');
})


generator.start();
