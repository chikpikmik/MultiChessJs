module.exports = {
    semi: false, // Добавляет точку с запятой в конце оператора.
    trailingComma: 'all', // Добавляет запятую в конце массива, объекта и тд.
    singleQuote: true, // Использует одинарные кавычки.
    printWidth: 100, // Максимальная длинна строки.
    tabWidth: 4, // Ширина табуляции.
    overrides: [
        {
            files: ['*.ejs', '*.svg'],
            options: {
                parser: 'html',
            },
        },
        {
            files: '*.js',
            options: {
                parser: 'babel',
            },
        },
    ],
}
