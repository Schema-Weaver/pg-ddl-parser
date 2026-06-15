-- PG18-specific DDL

CREATE TABLE temporal_main (
  id INT PRIMARY KEY,
  name TEXT,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  PERIOD FOR SYSTEM_TIME (valid_from, valid_to)
) WITH (system_versioning = true);

CREATE TABLE bookings (
  room_id INT,
  guest TEXT,
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  PERIOD FOR valid_time (valid_from, valid_to),
  EXCLUDE USING gist (room_id WITH =, valid_time WITHOUT OVERLAPS)
);

CREATE TABLE virtual_gen (
  id INT,
  raw TEXT,
  computed TEXT GENERATED ALWAYS AS (upper(raw)) VIRTUAL
);

CREATE TABLE not_enforced (
  id INT,
  age INT,
  CONSTRAINT age_check CHECK (age > 0) NOT ENFORCED
);

CREATE TABLE stored_gen (id INT, x INT, y INT GENERATED ALWAYS AS (x * 2) STORED);
ALTER TABLE stored_gen ALTER COLUMN y SET EXPRESSION ((x * 3));

CREATE TABLE pg18_pad_35 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_36 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_37 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_38 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_39 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_40 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_41 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_42 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_43 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_44 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_45 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_46 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_47 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_48 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_49 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_50 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_51 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_52 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_53 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_54 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_55 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_56 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_57 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_58 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_59 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_60 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_61 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_62 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_63 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_64 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_65 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_66 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_67 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_68 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_69 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_70 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_71 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_72 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_73 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_74 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_75 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_76 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_77 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_78 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_79 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_80 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_81 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_82 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_83 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_84 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_85 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_86 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_87 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_88 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_89 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_90 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_91 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_92 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_93 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_94 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_95 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_96 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_97 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_98 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_99 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_100 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_101 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_102 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_103 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_104 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_105 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_106 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_107 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_108 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_109 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_110 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_111 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_112 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_113 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_114 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_115 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_116 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_117 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_118 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_119 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_120 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_121 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_122 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_123 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_124 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_125 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_126 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_127 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_128 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_129 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_130 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_131 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_132 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_133 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_134 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_135 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_136 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_137 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_138 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_139 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_140 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_141 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_142 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_143 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_144 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_145 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_146 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_147 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_148 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_149 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_150 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_151 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_152 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_153 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_154 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_155 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_156 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_157 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_158 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_159 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_160 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_161 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_162 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_163 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_164 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_165 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_166 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_167 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_168 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_169 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_170 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_171 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_172 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_173 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_174 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_175 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_176 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_177 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_178 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_179 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_180 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_181 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_182 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_183 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_184 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_185 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_186 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_187 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_188 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_189 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_190 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_191 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_192 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_193 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_194 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_195 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_196 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_197 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_198 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_199 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_200 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_201 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_202 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_203 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_204 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_205 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_206 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_207 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_208 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_209 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_210 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_211 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_212 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_213 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_214 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_215 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_216 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_217 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_218 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_219 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_220 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_221 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_222 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_223 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_224 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_225 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_226 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_227 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_228 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_229 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_230 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_231 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_232 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_233 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_234 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_235 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_236 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_237 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_238 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_239 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_240 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_241 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_242 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_243 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_244 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_245 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_246 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_247 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_248 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_249 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_250 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_251 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_252 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_253 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_254 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_255 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_256 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_257 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_258 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
CREATE TABLE pg18_pad_259 (id INT, vf TIMESTAMPTZ, vt TIMESTAMPTZ, PERIOD FOR SYSTEM_TIME (vf, vt)) WITH (system_versioning = true);
