public class GenericClass {
  private BEAN bean;

  public GenericClass(BEAN bean) {
    this.bean = bean;
  }

  public BEAN setBean(BEAN bean) {
    this.bean = bean;
    return bean;
  }

  public T doSomething(T t) {
    return t;
  }
}

public class ComplexGenericClass extends AbstractBeanConfig<BEAN, CONFIG> {
  public List<?> getBean(final Class<BEAN> beanClass) {
    return new ArrayList<>();
  }
}

public class Foo {
  public void example(U u) {}

  public void example(U u) {}
}
