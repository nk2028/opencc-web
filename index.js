'use strict';

let converterFrontArea, converterBackArea;

document.addEventListener('DOMContentLoaded', () => {
	/* Initialize codemirror */
	converterFrontArea = CodeMirror(converterFront, {
		lineWrapping: true
	});
	converterBackArea = CodeMirror(converterBack, {
		lineWrapping: true,
		placeholder: '在此輸入待轉換的文字…'
	});
});


const DICT_ROOT = 'https://sgalal.github.io/opencc2-dict/data/';

const DICT_FROM = { 'cn': ['STCharacters', 'STPhrases']
	, 'hk': ['HKVariantsRev', 'HKVariantsRevPhrases']
	, 'tw': ['TWVariantsRev', 'TWVariantsRevPhrases']
	, 'twp': ['TWVariantsRev', 'TWVariantsRevPhrases', 'TWPhrasesRev']
	, 'jp': ['JPVariantsRev']
	},
	DICT_TO = { 'cn': ['TSCharacters', 'TSPhrases']
	, 'hk': ['HKVariants', 'HKVariantsPhrases']
	, 'tw': ['TWVariants']
	, 'twp': ['TWVariants', 'TWPhrasesIT', 'TWPhrasesName', 'TWPhrasesOther']
	, 'jp': ['JPVariants']
	};

async function getDictText(url) {
	const response = await fetch(DICT_ROOT + url + '.txt');
	const mytext = await response.text();
	return await mytext;
}

async function load_dict_from(s) {
	const DICTS = DICT_FROM[s];
	const d = {};
	for (const DICT of DICTS) {
		const txt = await getDictText(DICT);
		const lines = txt.split('\n');
		for (const line of lines) {
			if (line && !line.startsWith('#')) {
				const [l, r] = line.split('\t');
				d[l] = r;
			}
		}
	}
	return d;
} async function load_dict_to(s) {
	const DICTS = DICT_TO[s];  // 就這行和上面不同
	const d = {};
	for (const DICT of DICTS) {
		const txt = await getDictText(DICT);
		const lines = txt.split('\n');
		for (const line of lines) {
			if (line && !line.startsWith('#')) {
				const [l, r] = line.split('\t');
				d[l] = r;
			}
		}
	}
	return d;
}

function all_matches(s, d) {
	const arr = [];
	for (const [key, value] of Object.entries(d)) {
		if (s.startsWith(key)) {
			arr.push([key, value]);
		}
	}
	// 「白云」只有词，如果分词错误，那把「白」也加进去
	arr.sort((a, b) => b[0].length - a[0].length);  // sort by len(key)
	if (arr.length && arr[arr.length - 1][0].length > 1)
		arr.push([s[0], s[0]])
	return arr;
}

let ARR, SELECTION, DICT;

async function startConvert() {
	converterNotification.innerText = '';

	if (converterMiddleFront.innerText)
		return;

	// 只在開始時運行一次
	if (!DICT) {
		const region = convertRegion.value;

		if (convertScheme.value == 'from')
			DICT = await load_dict_from(region);
		else // (convertScheme.value == 'to')
			DICT = await load_dict_to(region);

		if (!DICT) {
			converterNotification.innerText = '您選擇的轉換方式是無效的';
			throw new Error('您選擇的轉換方式是無效的');
		}
	}

	while (converterBackArea.getValue()) {
		const s = converterBackArea.getValue();
		ARR = all_matches(s, DICT);

		if (!ARR.length) /* 繁简同形 */ {
			converterFrontArea.setValue(converterFrontArea.getValue() + s[0]);
			converterBackArea.setValue(s.slice(1));
		} else if (ARR.length == 1 && ARR[0][0].length == 1 && ARR[0][1].split(' ').length == 1) /* 一一映射 */ {
			converterFrontArea.setValue(converterFrontArea.getValue() + ARR[0][1]);
			converterBackArea.setValue(s.slice(1));
		} else {
			SELECTION = 0;
			const longest = ARR[0][0].length;

			if (longest == 1)
				converterSwitchSegmentation.disabled = true;
			else
				converterSwitchSegmentation.disabled = false;

			refreshSwitch();
			converterBackArea.setValue(s.slice(longest));
			return;
		}
	}

	converterNotification.innerText = '轉換完成';
}

function refreshSwitch() {
	const currentKey = ARR[SELECTION][0];
	const currentValue = ARR[SELECTION][1];
	const currentValues = currentValue.split(' ');

	converterMiddleFront.innerText = currentKey;
	converterMiddleBack.innerText = ARR[0][0].slice(currentKey.length);

	converterSelect.innerHTML = '';
	for (const value of currentValues) {
		const opt = document.createElement('option');
		opt.value = value;
		opt.innerText = value;
		converterSelect.appendChild(opt);
	}

	if (currentValues.length == 1)
		converterSelect.disabled = true;
	else
		converterSelect.disabled = false;

	startExplain();
}

function makeMoeEntry(entry) {
	const div = document.createElement('div');
	for (const [key, values] of Object.entries(entry)) {
		const p = document.createElement('p');
		p.innerText = key;
		div.appendChild(p);
		const ul = document.createElement('ul');
		for (const value of values) {
			const li = document.createElement('li');
			li.innerText = value;
			ul.appendChild(li);
		}
		div.appendChild(ul);
	}
	return div;
}

function startExplain() {
	converterExplain.innerHTML = '';
	const res = MOEDICT[converterSelect.value];
	if (res)
		converterExplain.appendChild(makeMoeEntry(res));
}

function startSwitch() {
	SELECTION = (SELECTION + 1) % ARR.length;
	refreshSwitch();
}

function startPush() {
	converterFrontArea.setValue(converterFrontArea.getValue() + converterSelect.value);
	converterBackArea.setValue(converterMiddleBack.innerText + converterBackArea.getValue());
	converterMiddleFront.innerText = '';
	converterMiddleBack.innerText = '';

	startConvert();
}
