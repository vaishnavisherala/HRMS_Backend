--
-- PostgreSQL database dump
--

\restrict jumb7Es2hrS2CqsIVaqCb2KXNdU3tMgNgQwKrHBVZPkRzBl1VCuYOtonuHoz6dT

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ActivationToken; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ActivationToken" (
    id integer NOT NULL,
    token text NOT NULL,
    emp_id integer NOT NULL,
    expiry timestamp(3) without time zone NOT NULL,
    "isUsed" boolean DEFAULT false NOT NULL
);


ALTER TABLE public."ActivationToken" OWNER TO postgres;

--
-- Name: ActivationToken_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."ActivationToken_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."ActivationToken_id_seq" OWNER TO postgres;

--
-- Name: ActivationToken_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."ActivationToken_id_seq" OWNED BY public."ActivationToken".id;


--
-- Name: Admin; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Admin" (
    admin_id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Admin" OWNER TO postgres;

--
-- Name: Admin_admin_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Admin_admin_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Admin_admin_id_seq" OWNER TO postgres;

--
-- Name: Admin_admin_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Admin_admin_id_seq" OWNED BY public."Admin".admin_id;


--
-- Name: Employee; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Employee" (
    emp_id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    password text,
    is_verified boolean DEFAULT false NOT NULL,
    status text DEFAULT 'Inactive'::text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Employee" OWNER TO postgres;

--
-- Name: Employee_emp_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public."Employee_emp_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Employee_emp_id_seq" OWNER TO postgres;

--
-- Name: Employee_emp_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public."Employee_emp_id_seq" OWNED BY public."Employee".emp_id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Name: ActivationToken id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivationToken" ALTER COLUMN id SET DEFAULT nextval('public."ActivationToken_id_seq"'::regclass);


--
-- Name: Admin admin_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin" ALTER COLUMN admin_id SET DEFAULT nextval('public."Admin_admin_id_seq"'::regclass);


--
-- Name: Employee emp_id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Employee" ALTER COLUMN emp_id SET DEFAULT nextval('public."Employee_emp_id_seq"'::regclass);


--
-- Data for Name: ActivationToken; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ActivationToken" (id, token, emp_id, expiry, "isUsed") FROM stdin;
\.


--
-- Data for Name: Admin; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Admin" (admin_id, name, email, password, "createdAt") FROM stdin;
1	Admin	admin@gmail.com	$2b$10$qBiQ9m3GzFGLmd78IRykx.1Hp4LiiBTiortN4psCrA6h6dAS2wD0m	2026-04-03 10:30:26.051
\.


--
-- Data for Name: Employee; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Employee" (emp_id, name, email, password, is_verified, status, "createdAt") FROM stdin;
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
034cadf4-e56b-45fd-8cb5-4cc624bd6e41	a212bbb1bf1c1f5011aa0af851ad361dce4de06f7fef2e6a97822a2df455ca70	2026-04-03 15:56:17.530197+05:30	20260403102617_init	\N	\N	2026-04-03 15:56:17.42535+05:30	1
\.


--
-- Name: ActivationToken_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."ActivationToken_id_seq"', 1, false);


--
-- Name: Admin_admin_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Admin_admin_id_seq"', 1, true);


--
-- Name: Employee_emp_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public."Employee_emp_id_seq"', 1, false);


--
-- Name: ActivationToken ActivationToken_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivationToken"
    ADD CONSTRAINT "ActivationToken_pkey" PRIMARY KEY (id);


--
-- Name: Admin Admin_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Admin"
    ADD CONSTRAINT "Admin_pkey" PRIMARY KEY (admin_id);


--
-- Name: Employee Employee_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Employee"
    ADD CONSTRAINT "Employee_pkey" PRIMARY KEY (emp_id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ActivationToken_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ActivationToken_token_key" ON public."ActivationToken" USING btree (token);


--
-- Name: Admin_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Admin_email_key" ON public."Admin" USING btree (email);


--
-- Name: Employee_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Employee_email_key" ON public."Employee" USING btree (email);


--
-- Name: ActivationToken ActivationToken_emp_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ActivationToken"
    ADD CONSTRAINT "ActivationToken_emp_id_fkey" FOREIGN KEY (emp_id) REFERENCES public."Employee"(emp_id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict jumb7Es2hrS2CqsIVaqCb2KXNdU3tMgNgQwKrHBVZPkRzBl1VCuYOtonuHoz6dT