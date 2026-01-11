'use strict'

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) adiciona coluna como NULL primeiro (pra não quebrar tabela com dados)
    await queryInterface.addColumn('countries', 'iso2', {
      type: Sequelize.CHAR(2),
      allowNull: true,
      unique: false // o unique a gente cria depois do backfill
    })

    // 2) backfill do iso2 baseado no name (match exato)
    const map = {
      'Afghanistan': 'AF',
      'Albania': 'AL',
      'Algeria': 'DZ',
      'Andorra': 'AD',
      'Angola': 'AO',
      'Antigua and Barbuda': 'AG',
      'Argentina': 'AR',
      'Armenia': 'AM',
      'Australia': 'AU',
      'Austria': 'AT',
      'Azerbaijan': 'AZ',
      'Bahamas': 'BS',
      'Bahrain': 'BH',
      'Bangladesh': 'BD',
      'Barbados': 'BB',
      'Belarus': 'BY',
      'Belgium': 'BE',
      'Belize': 'BZ',
      'Benin': 'BJ',
      'Bhutan': 'BT',
      'Bolivia': 'BO',
      'Bosnia and Herzegovina': 'BA',
      'Botswana': 'BW',
      'Brazil': 'BR',
      'Brunei': 'BN',
      'Bulgaria': 'BG',
      'Burkina Faso': 'BF',
      'Burundi': 'BI',
      'Cabo Verde': 'CV',
      'Cambodia': 'KH',
      'Cameroon': 'CM',
      'Canada': 'CA',
      'Central African Republic': 'CF',
      'Chad': 'TD',
      'Chile': 'CL',
      'China': 'CN',
      'Colombia': 'CO',
      'Comoros': 'KM',
      'Congo': 'CG',
      'Costa Rica': 'CR',
      "Côte d'Ivoire": 'CI',
      'Croatia': 'HR',
      'Cuba': 'CU',
      'Cyprus': 'CY',
      'Czechia': 'CZ',
      'Democratic Republic of the Congo': 'CD',
      'Denmark': 'DK',
      'Djibouti': 'DJ',
      'Dominica': 'DM',
      'Dominican Republic': 'DO',
      'Ecuador': 'EC',
      'Egypt': 'EG',
      'El Salvador': 'SV',
      'Equatorial Guinea': 'GQ',
      'Eritrea': 'ER',
      'Estonia': 'EE',
      'Eswatini': 'SZ',
      'Ethiopia': 'ET',
      'Fiji': 'FJ',
      'Finland': 'FI',
      'France': 'FR',
      'Gabon': 'GA',
      'Gambia': 'GM',
      'Georgia': 'GE',
      'Germany': 'DE',
      'Ghana': 'GH',
      'Greece': 'GR',
      'Grenada': 'GD',
      'Guatemala': 'GT',
      'Guinea': 'GN',
      'Guinea-Bissau': 'GW',
      'Guyana': 'GY',
      'Haiti': 'HT',
      'Honduras': 'HN',
      'Hungary': 'HU',
      'Iceland': 'IS',
      'India': 'IN',
      'Indonesia': 'ID',
      'Iran': 'IR',
      'Iraq': 'IQ',
      'Ireland': 'IE',
      'Israel': 'IL',
      'Italy': 'IT',
      'Jamaica': 'JM',
      'Japan': 'JP',
      'Jordan': 'JO',
      'Kazakhstan': 'KZ',
      'Kenya': 'KE',
      'Kiribati': 'KI',
      'North Korea': 'KP',
      'South Korea': 'KR',
      'Kuwait': 'KW',
      'Kyrgyzstan': 'KG',
      'Laos': 'LA',
      'Latvia': 'LV',
      'Lebanon': 'LB',
      'Lesotho': 'LS',
      'Liberia': 'LR',
      'Libya': 'LY',
      'Liechtenstein': 'LI',
      'Lithuania': 'LT',
      'Luxembourg': 'LU',
      'Madagascar': 'MG',
      'Malawi': 'MW',
      'Malaysia': 'MY',
      'Maldives': 'MV',
      'Mali': 'ML',
      'Malta': 'MT',
      'Marshall Islands': 'MH',
      'Mauritania': 'MR',
      'Mauritius': 'MU',
      'Mexico': 'MX',
      'Micronesia': 'FM',
      'Moldova': 'MD',
      'Monaco': 'MC',
      'Mongolia': 'MN',
      'Montenegro': 'ME',
      'Morocco': 'MA',
      'Mozambique': 'MZ',
      'Myanmar': 'MM',
      'Namibia': 'NA',
      'Nauru': 'NR',
      'Nepal': 'NP',
      'Netherlands': 'NL',
      'New Zealand': 'NZ',
      'Nicaragua': 'NI',
      'Niger': 'NE',
      'Nigeria': 'NG',
      'North Macedonia': 'MK',
      'Norway': 'NO',
      'Oman': 'OM',
      'Pakistan': 'PK',
      'Palau': 'PW',
      'Panama': 'PA',
      'Papua New Guinea': 'PG',
      'Paraguay': 'PY',
      'Peru': 'PE',
      'Philippines': 'PH',
      'Poland': 'PL',
      'Portugal': 'PT',
      'Qatar': 'QA',
      'Romania': 'RO',
      'Russia': 'RU',
      'Rwanda': 'RW',
      'Saint Kitts and Nevis': 'KN',
      'Saint Lucia': 'LC',
      'Saint Vincent and the Grenadines': 'VC',
      'Samoa': 'WS',
      'San Marino': 'SM',
      'Sao Tome and Principe': 'ST',
      'Saudi Arabia': 'SA',
      'Senegal': 'SN',
      'Serbia': 'RS',
      'Seychelles': 'SC',
      'Sierra Leone': 'SL',
      'Singapore': 'SG',
      'Slovakia': 'SK',
      'Slovenia': 'SI',
      'Solomon Islands': 'SB',
      'Somalia': 'SO',
      'South Africa': 'ZA',
      'South Sudan': 'SS',
      'Spain': 'ES',
      'Sri Lanka': 'LK',
      'Sudan': 'SD',
      'Suriname': 'SR',
      'Sweden': 'SE',
      'Switzerland': 'CH',
      'Syria': 'SY',
      'Tajikistan': 'TJ',
      'Tanzania': 'TZ',
      'Thailand': 'TH',
      'Timor-Leste': 'TL',
      'Togo': 'TG',
      'Tonga': 'TO',
      'Trinidad and Tobago': 'TT',
      'Tunisia': 'TN',
      'Turkey': 'TR',
      'Turkmenistan': 'TM',
      'Tuvalu': 'TV',
      'Uganda': 'UG',
      'Ukraine': 'UA',
      'United Arab Emirates': 'AE',
      'United Kingdom': 'GB',
      'United States': 'US',
      'Uruguay': 'UY',
      'Uzbekistan': 'UZ',
      'Vanuatu': 'VU',
      'Vatican City': 'VA',
      'Venezuela': 'VE',
      'Vietnam': 'VN',
      'Yemen': 'YE',
      'Zambia': 'ZM',
      'Zimbabwe': 'ZW'
    }

    // atualiza em batch (um update por país)
    // Observação: usa update direto na tabela, sem depender do Model
    for (const [name, iso2] of Object.entries(map)) {
      await queryInterface.sequelize.query(
        'UPDATE countries SET iso2 = :iso2 WHERE name = :name',
        { replacements: { iso2, name } }
      )
    }

    // 3) valida se ficou algum sem iso2 (evita travar silenciosamente)
    const [rows] = await queryInterface.sequelize.query(
      'SELECT id, name FROM countries WHERE iso2 IS NULL OR iso2 = ""'
    )
    if (rows.length) {
      throw new Error(
        `Backfill iso2 incompleto. Países sem iso2: ${rows
          .map(r => `${r.id}:${r.name}`)
          .join(', ')}`
      )
    }

    // 4) altera a coluna para NOT NULL
    await queryInterface.changeColumn('countries', 'iso2', {
      type: Sequelize.CHAR(2),
      allowNull: false
    })

    // 5) cria índice unique no iso2
    await queryInterface.addIndex('countries', ['iso2'], {
      unique: true,
      name: 'countries_iso2_uindex'
    })
  },

  async down(queryInterface, Sequelize) {
    // remove índice + coluna
    await queryInterface.removeIndex('countries', 'countries_iso2_uindex')
    await queryInterface.removeColumn('countries', 'iso2')
  }
}
