-- Limpieza única del catálogo en la nube (8 de septiembre de 2026).
-- Cada dispositivo había sembrado el menú con ids al azar; desde la versión 17
-- los ids salen del nombre y son iguales en todos lados. Aquí se borran las
-- copias viejas de productos e insumos y queda solo el catálogo oficial
-- (32 productos, 37 insumos). Las bajas dejan lápida y llegan solas a todos
-- los dispositivos. Ventas, cortes, compras y personal no se tocan.
--
-- Correr con:  supabase db query --linked -f supabase/limpieza_catalogo_2026-09-08.sql

delete from public.products where id::text not in (
  '03332fdb-5d00-4bac-86a5-16bd00a8e24e', '0a3ee4c1-855a-4daa-8729-9e4355cea17c', '10d78e59-1094-4804-8f0c-da0b54266ace',
  '22441dcb-69df-486a-85f2-e4156d1adae4', '22c9dd0d-f9f3-4b4e-8c9a-29ab42d99a14', '2d12f1c4-f2cb-4747-8f73-580ef5103d51',
  '2f34eefc-e79d-4a05-88e7-cb92d281f113', '3f4bac37-9a64-4bea-80ce-84edb5a538c8', '40648250-a538-49eb-8c60-2c3ea5408ba9',
  '51af9e05-41b8-49a6-89a6-f767bfd004d0', '6b52b45d-0022-4e98-8983-66831adb0aee', '6d4b8670-b4d7-479d-8b26-da36f5bca93b',
  '7ae6a9b3-6d5e-477e-8805-3579bc02e924', '81edf107-965a-4eee-81f9-66398e98e5e0', '866dc2e7-4dc1-4d10-8384-3991bd915962',
  '8764c69e-a03f-48a9-878d-8f94fc9cf97f', '8dc7f9d7-1909-4d24-86dc-6ce52c719eba', '91636b86-fe87-4e39-8524-45c871f46733',
  '9d930eaf-832c-42ea-886a-7f999b25ddb4', 'bdab1af5-4677-45b2-8535-7bdb9ad9f730', 'c0a08e84-3b6f-4187-8f5b-282242cc0b9d',
  'cef0ea75-6c86-4358-8310-f24ff0741672', 'd268e583-18ad-4406-89ed-c6c12c993644', 'd5df0f46-e3a3-4881-8464-c93818f86ba3',
  'db693c02-1577-41fd-88c0-c07cdd3c5497', 'e11a9363-7eca-41c4-82a1-02617153823a', 'ec86d409-bd3b-4db2-8378-616f1f74de68',
  'ec9da3f3-8db2-483e-8470-76fdf0e72ef0', 'f4782c1b-b23a-46b8-8351-eac168d05df6', 'f5186a69-22a9-4854-85f2-88db5b48d99e',
  'f546fea7-c023-4012-8de0-efcda5294238', 'fea1da43-aa20-4b12-835d-9409ea3e4b20'
);

delete from public.ingredients where id::text not in (
  '07fea424-f44f-4617-85ad-e5fefa6ed109', '0ed8a67d-b04f-4d68-84a7-4a77da664a22', '199856bf-3992-401c-845d-a75d38c810f2',
  '1ca952e4-6ce4-4df1-8e00-10ba130e5797', '256b2112-0cb2-44c1-8bff-9408aa67e477', '26b22b96-b69a-4deb-8381-ea90703a6195',
  '2d749b4d-99f3-49ea-84bc-0deb2e918840', '2e794a30-bc6c-4283-8ca7-9472949aa21d', '327ad9f9-0b67-4462-8bfb-87cfb06324c8',
  '3ccc75e1-aad4-4f5e-8d85-57672649681c', '3edd913b-7b16-49b6-8963-8819b0cafb5c', '4166137f-45e9-4a5c-8f24-979db71d32b2',
  '4e0eace6-bf06-4899-828e-d20cee9009af', '508f3f5c-02c1-4df7-8db5-eab2dcf1135d', '5133acee-a9e6-479f-8021-3ce83627c761',
  '70bcbe40-5696-495b-8545-195a7bdcdf9d', '7131fd3f-5eb7-4e44-8926-17f9ffd78146', '73cd12c6-25ce-48ed-881b-8d685aa3aa7f',
  '85fad16a-0a69-46d7-86dd-2958693a24e5', '88409a6f-98aa-40fa-82f1-8659e551bc94', '8e6096d5-2d52-476e-8b6f-b2b7d63dbbf0',
  '94c41d06-82da-4c59-8d24-3d50babf1fb3', '9c7ffc5e-7640-4279-8da4-db30c1d734b3', 'b4c6a35a-db4b-476d-84b2-fb6cdac01307',
  'b5334876-a376-4191-81a6-bc284912709b', 'badfc453-d4a0-406e-8376-a16dfd2c4c90', 'bfa7d775-c3d0-4afa-8b63-d1b7f0ce9dfc',
  'd4744b35-47a5-4b82-8c48-6363d6e1ab98', 'd622212f-7fae-4e34-8605-d4913a8e075e', 'd8bcfa79-c860-448c-8f9c-85ef9936721a',
  'de92db8f-2e86-43ea-8bed-b3b124c4b044', 'eae65142-8470-446f-842a-7384c5016df1', 'ed01c0f2-7046-4bbf-8c8f-8bc4fc415d79',
  'ef5a3b2a-1cf7-49d9-8b45-623ceb942ca3', 'f2e3743e-0ae7-411f-8a57-8ce4f6a68325', 'fbadd9ee-3107-4a4d-83f3-2a20d172a7ff',
  'fc4fecc4-6422-4bfd-8efd-fcd699df2537'
);

select (select count(*) from public.products) as productos, (select count(*) from public.ingredients) as insumos;
